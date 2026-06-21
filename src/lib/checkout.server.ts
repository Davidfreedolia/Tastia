import { createServerFn } from "@tanstack/react-start";
import process from "node:process";
import Stripe from "stripe";
import { z } from "zod";

import { PACK_CATALOG, cartAmountCents, type CheckoutItem } from "./checkout";

// Server-only checkout. The .handler body runs on the server only — the Stripe
// SDK import and STRIPE_SECRET_KEY never reach the client bundle. The secret is
// read with process.env INSIDE the handler (per-request), as required.

const inputSchema = z.object({
  items: z
    .array(
      z.object({
        // Only id + qty are trusted; any client-sent price is ignored.
        id: z.string().min(1),
        // Positivo y acotado: rechaza 0/negativos y cantidades abusivas (no hay carritos así).
        qty: z.number().int().positive().max(99),
      }),
    )
    .min(1),
  // The client passes window.location.origin so we build absolute return URLs.
  origin: z.string().url(),
});

// Discriminated result so the client can branch safely.
export type CreateCheckoutResult =
  | { configured: false }
  | { configured: true; url: string | null }
  | { configured: true; error: string };

export const createCheckout = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }): Promise<CreateCheckoutResult> => {
    const key = process.env.STRIPE_SECRET_KEY;
    // Honest fallback: with no key, do NOT pretend a purchase happened.
    if (!key) {
      return { configured: false };
    }

    const items: CheckoutItem[] = data.items.map((i) => ({ id: i.id, qty: i.qty }));

    try {
      // Recompute the amount server-side from the trusted catalog. This also
      // validates every id (unknown id → throw) and gives us per-line amounts.
      // Calling it here surfaces an unknown-id error before hitting Stripe.
      cartAmountCents(items);

      const stripe = new Stripe(key);

      const line_items = items
        .filter((i) => i.qty > 0)
        .map((i) => {
          const entry = PACK_CATALOG[i.id];
          if (!entry) throw new Error(`Unknown pack id: ${i.id}`);
          return {
            quantity: i.qty,
            price_data: {
              currency: "eur",
              product_data: { name: entry.name },
              unit_amount: entry.amount_cents, // trusted, server-side
            },
          };
        });

      // Defensa: nunca llamar a Stripe con un carrito sin líneas.
      if (line_items.length === 0) return { configured: true, error: "Empty cart" };

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items,
        success_url: `${data.origin}/landing?checkout=success`,
        cancel_url: `${data.origin}/landing?checkout=cancel`,
      });

      return { configured: true, url: session.url };
    } catch (err) {
      // Loguea el detalle en el servidor; al cliente solo un mensaje genérico (no filtrar
      // nombres de parámetros ni internals de Stripe a través de la red).
      console.error("[create-checkout]", err);
      return { configured: true, error: "Checkout failed" };
    }
  });

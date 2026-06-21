import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import process from "node:process";
import Stripe from "stripe";

import type { Database } from "@/lib/database.types";
import { generateAccessCode, orderInsertFromSession } from "@/lib/orders";

// §Stripe-B1 — Webhook de Stripe (ruta de servidor en Vercel/Nitro).
//
// NOTA de convención: la spec pedía `createAPIFileRoute('/api/stripe-webhook')`
// de `@tanstack/react-start/api`. Esa API NO existe en la versión instalada
// (@tanstack/react-start@1.167.50 — no hay export `./api` ni el símbolo
// `createAPIFileRoute` en el dist). En esta versión las rutas de servidor (API)
// se definen con `createFileRoute(path)({ server: { handlers: { POST } } })`
// (ver node_modules/@tanstack/react-start/skills/lifecycle/migrate-from-nextjs).
// El handler recibe `{ request }` (un `Request` Web estándar) y devuelve `Response`,
// que es exactamente lo que necesita la verificación de firma con el raw body.
//
// El handler corre SOLO en el servidor: el secreto de Stripe y la service key de
// Supabase se leen con `process.env` por-request y nunca llegan al cliente.

export const Route = createFileRoute("/api/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sig = request.headers.get("stripe-signature");
        // Raw body: `constructEventAsync` exige el cuerpo SIN parsear para validar la firma.
        const raw = await request.text();

        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        const key = process.env.STRIPE_SECRET_KEY;
        if (!secret || !key || !sig) {
          console.error(
            "[stripe-webhook] Falta STRIPE_WEBHOOK_SECRET / STRIPE_SECRET_KEY o la cabecera stripe-signature",
          );
          return new Response("Webhook no configurado o firma ausente", {
            status: 400,
          });
        }

        const stripe = new Stripe(key);

        // Verificación de firma con la versión ASYNC (Web Crypto): necesaria en
        // runtimes web/edge como el de Vercel/Nitro.
        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(raw, sig, secret);
        } catch (err) {
          console.error("[stripe-webhook] Firma inválida", err);
          return new Response("Firma inválida", { status: 400 });
        }

        // Eventos no manejados → 2xx rápido (Stripe no debe reintentar).
        if (event.type !== "checkout.session.completed") {
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
          });
        }

        const session = event.data.object as Stripe.Checkout.Session;

        // Solo fulfillment de sesiones REALMENTE pagadas: `checkout.session.completed` también dispara
        // para métodos de pago async (status 'unpaid'/'no_payment_required') que liquidan más tarde.
        // No marcamos 'pagado' ni damos access_code hasta que payment_status === 'paid'.
        if (session.payment_status !== "paid") {
          return new Response(JSON.stringify({ received: true, unpaid: true }), { status: 200 });
        }

        // Cliente ADMIN (service role): escribe `orders` saltando RLS. Solo servidor.
        const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
        const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!svc || !url) {
          console.error(
            "[stripe-webhook] Falta SUPABASE_SERVICE_ROLE_KEY o SUPABASE_URL/VITE_SUPABASE_URL",
          );
          // 500 → Stripe reintentará cuando el secreto esté configurado.
          return new Response("Falta service key", { status: 500 });
        }

        const admin = createClient<Database>(url, svc);

        // Idempotencia por stripe_session_id: si ya existe el pedido, no duplicar.
        const { data: existing } = await admin
          .from("orders")
          .select("id")
          .eq("stripe_session_id", session.id)
          .maybeSingle();
        if (existing) {
          return new Response(
            JSON.stringify({ received: true, duplicate: true }),
            { status: 200 },
          );
        }

        // Inserta el pedido (cabecera): status 'pagado', email/importes de la sesión,
        // stripe_session_id y un access_code recién generado.
        const { error } = await admin
          .from("orders")
          .insert(orderInsertFromSession(session, generateAccessCode()));
        if (error) {
          console.error("[stripe-webhook] Error al insertar el pedido", error);
          // 500 → Stripe reintentará el evento.
          return new Response("DB error", { status: 500 });
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
        });
      },
    },
  },
});

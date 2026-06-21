// Pure checkout logic — NO I/O, NO React. Safe to import from both client
// and server code AND from tests. The server (createCheckout) recomputes the
// amount from this trusted catalog and NEVER trusts the price sent by the
// client.

export type PackCatalogEntry = {
  name: string;
  amount_cents: number;
};

// Trusted price catalog. Pack ids MUST match the ids used by the cart in
// src/routes/landing.tsx (handleBuy → { id: p.id, ... }) and the pack list in
// the Packs component: "winelover" (80€), "enology" (120€), "deluxe" (160€).
export const PACK_CATALOG: Record<string, PackCatalogEntry> = {
  winelover: { name: "Pack Winelover", amount_cents: 8000 },
  enology: { name: "Pack Enology", amount_cents: 12000 },
  deluxe: { name: "Pack Deluxe", amount_cents: 16000 },
};

// Minimal shape the server needs. The client price is intentionally absent —
// only id + qty are used; the amount is recomputed from PACK_CATALOG.
export type CheckoutItem = {
  id: string;
  qty: number;
};

/**
 * Recompute the cart total (in cents) from the trusted catalog.
 * - Ignores any price the client may have sent (only id + qty are read).
 * - Unknown id → throws (never charge for an id we don't recognise).
 * - qty <= 0 is ignored (does not contribute to the total).
 */
export function cartAmountCents(items: CheckoutItem[]): number {
  let total = 0;
  for (const item of items) {
    if (item.qty <= 0) continue; // ignore non-positive quantities
    const entry = PACK_CATALOG[item.id];
    if (!entry) {
      throw new Error(`Unknown pack id: ${item.id}`);
    }
    total += entry.amount_cents * item.qty;
  }
  return total;
}

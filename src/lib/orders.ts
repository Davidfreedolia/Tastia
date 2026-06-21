import type Stripe from "stripe";
import type { Database } from "./database.types";

// Lógica PURA del fulfillment de pedidos (§Stripe-B1). Sin I/O ni red:
// el webhook (src/routes/api/stripe-webhook.ts) hace la red y delega aquí el
// mapeo determinista. Así estas funciones son testeables sin Stripe ni Supabase.

// Alfabeto sin caracteres ambiguos (sin 0/O, 1/I/L). 8 chars → code corto y legible.
const ACCESS_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const ACCESS_CODE_LENGTH = 8;

/**
 * Genera un `access_code` de 8 caracteres del alfabeto sin ambiguos.
 * Usa `crypto.getRandomValues` cuando está disponible (CSPRNG); si no,
 * cae a `Math.random` (entornos sin Web Crypto). No es I/O ni red.
 */
export function generateAccessCode(): string {
  const n = ACCESS_CODE_LENGTH;
  const alphabetLen = ACCESS_CODE_ALPHABET.length;
  const out: string[] = [];

  const cryptoObj =
    typeof globalThis !== "undefined" ? globalThis.crypto : undefined;

  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    const bytes = new Uint8Array(n);
    cryptoObj.getRandomValues(bytes);
    for (let i = 0; i < n; i++) {
      out.push(ACCESS_CODE_ALPHABET[bytes[i] % alphabetLen]);
    }
  } else {
    for (let i = 0; i < n; i++) {
      out.push(ACCESS_CODE_ALPHABET[Math.floor(Math.random() * alphabetLen)]);
    }
  }

  return out.join("");
}

/**
 * Shape mínimo del Insert de `orders` que escribe el webhook. Es un subconjunto
 * de Database["public"]["Tables"]["orders"]["Insert"] (el resto de columnas son
 * nullable o tienen default en la BD).
 */
export type OrderInsert = Pick<
  Database["public"]["Tables"]["orders"]["Insert"],
  | "email"
  | "subtotal_cents"
  | "total_cents"
  | "shipping_cents"
  | "status"
  | "stripe_session_id"
  | "access_code"
>;

/**
 * Mapea una `Stripe.Checkout.Session` (ya verificada y obtenida por el webhook)
 * al payload de Insert de `orders`. PURO: recibe el `accessCode` ya generado
 * para ser determinista/testeable. Los importes y el email SIEMPRE salen de la
 * sesión de Stripe (nunca del cliente).
 */
export function orderInsertFromSession(
  session: Stripe.Checkout.Session,
  accessCode: string,
): OrderInsert {
  return {
    email: session.customer_details?.email ?? session.customer_email ?? "",
    subtotal_cents: session.amount_subtotal ?? 0,
    total_cents: session.amount_total ?? 0,
    shipping_cents: session.total_details?.amount_shipping ?? 0,
    status: "pagado",
    stripe_session_id: session.id,
    access_code: accessCode,
  };
}

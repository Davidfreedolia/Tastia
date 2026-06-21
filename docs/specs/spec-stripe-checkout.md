---
title: '§Stripe-A — Checkout de pago en modo TEST (Vercel server fn) + fallback honesto'
type: 'feature'
created: '2026-06-21'
status: 'done'
baseline_commit: 'adce5c3'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El checkout del carrito es **FALSO**: `handlePay` hace `setStep("done")` ("*Simulated
payment*") y muestra "¡Reserva confirmada! Recibirás un email…" **sin crear nada ni cobrar** — viola la
regla de copy honesto y no hay pago real.

**Approach:** Pago real en **modo TEST de Stripe** vía un `createServerFn` (corre en Vercel con la app
→ **sin depender del deploy de Salvador**): el carrito llama al server fn con los packs → crea una
**Stripe Checkout Session** (hosted, line items con importe recomputado server-side) → redirige a Stripe
→ el usuario paga con tarjeta de test (4242…) → vuelve a la web. Si `STRIPE_SECRET_KEY` no está
configurada → **fallback HONESTO** ("Próximamente: pago con Stripe", sin fingir compra). La persistencia
del pedido (webhook) es **§Stripe-B (diferido)**.

## Product Decisions

- **Stripe Checkout HOSTED** (redirect) -- simple y seguro (datos de tarjeta en Stripe, no en nuestra web).
- **Server-side vía `createServerFn`** (Vercel, NO Supabase edge fn) -- se despliega con la app, sin Salvador.
- **Modo TEST** (`sk_test_…`); claves en **env de Vercel** (las pone David; equipo de confianza, nada importante en Stripe).
- **Importe recomputado server-side** desde un catálogo fiable (id de pack → precio) -- no confiar en el precio del cliente.
- **Fallback honesto** si no hay clave: "Próximamente: pago con Stripe" -- elimina el falso "reserva confirmada".
- **§Stripe-B** (webhook + `orders` + `access_code` + QR + email) diferido.

## Boundaries & Constraints

**Always:** `STRIPE_SECRET_KEY` **solo** server-side (`createServerFn`/`.server.ts`, leído con
`process.env` dentro del handler), **NUNCA** en cliente (nada de `VITE_`); el importe (céntimos) se
calcula en el servidor desde el catálogo de packs (ignora el precio enviado por el cliente); mantener
los consentimientos age/terms antes de pagar; `success_url`/`cancel_url` de la propia web.

**Ask First:** activar **modo live** (cobro real) -- NO, solo test; tocar el esquema de `orders` (eso es §B).

**Never:** poner secretos en el cliente; **fingir** un pago o un pedido (honestidad); persistir el pedido
(eso es §B, vía webhook); tocar edge functions del juego, el avatar ni migraciones de Salvador.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Pagar (Stripe configurado) | packs + consentimientos | el server fn crea la sesión test y devuelve `url`; el cliente redirige a Stripe; con 4242… vuelve a `?checkout=success` | error de Stripe → mensaje en el carrito, sin romper |
| Stripe NO configurado | falta `STRIPE_SECRET_KEY` | server fn → `{ configured:false }`; el carrito muestra "Próximamente: pago con Stripe" | — (no finge compra) |
| Precio manipulado en cliente | item con precio falso | el servidor recomputa el importe desde el catálogo (id→precio); ignora el del cliente | id desconocido → error, no cobra |
| Vuelta de Stripe (éxito) | `?checkout=success` | la web muestra confirmación de pago **de test**; el pedido durable llega en §B | — |
| Cancelar en Stripe | `?checkout=cancel` | vuelve al carrito SIN fingir compra | — |

</frozen-after-approval>

## Code Map

- `src/components/cart-sheet.tsx` -- checkout simulado: `handlePay`→`setStep("done")` (líneas ~39-44) + pantalla "done" con copy falso → cablear a `createCheckout` + redirect + fallback honesto.
- `src/routes/landing.tsx` -- monta el carrito (`cartOpen`/items, ~881-945) → manejar `?checkout=success|cancel`.
- `src/lib/checkout.server.ts` -- **NUEVO**: `createCheckout` (`createServerFn`) + catálogo de precios fiable + validación (pura) del importe.
- `src/lib/config.server.ts` -- patrón de env server-only (`process.env` dentro del handler; ya menciona `STRIPE_SECRET_KEY` como ejemplo).
- `package.json` -- añadir dependencia `stripe` (SDK de servidor).
- `src/lib/i18n.tsx` -- strings del fallback "Próximamente" y de la confirmación de test.

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- añadir `stripe` (SDK Node) como dependencia.
- [x] `src/lib/checkout.ts` -- catálogo fiable de packs (`id → { name, amount_cents }`) y función PURA `cartAmountCents(items)` que recomputa el total desde el catálogo (ignora el precio del cliente; id desconocido → error). Sin I/O.
- [x] `src/lib/checkout.test.ts` -- tests de `cartAmountCents` (recompute correcto, ignora precio cliente, id desconocido, cantidades).
- [x] `src/lib/checkout.server.ts` (NUEVO) -- `createCheckout` (`createServerFn`): si falta `process.env.STRIPE_SECRET_KEY` → `{ configured:false }`; si no, recomputa importe con `cartAmountCents`, crea `stripe.checkout.sessions.create` (mode `payment`, line items `price_data` EUR desde el catálogo, `success_url=…?checkout=success`, `cancel_url=…?checkout=cancel`), devuelve `{ url }`.
- [x] `src/components/cart-sheet.tsx` -- `handlePay`: llama a `createCheckout`; `{ url }` → `window.location.href = url`; `{ configured:false }` → estado "Próximamente: pago con Stripe" (eliminar el falso `done`/"reserva confirmada"); error → mensaje.
- [x] `src/routes/landing.tsx` -- al cargar con `?checkout=success` mostrar confirmación (de test); `?checkout=cancel` → volver al carrito.
- [x] `src/lib/i18n.tsx` -- strings: "Próximamente: pago con Stripe", confirmación de pago de test.

**Acceptance Criteria:**
- Given `STRIPE_SECRET_KEY` en el env, when el usuario paga, then redirige a Stripe Checkout (test) y al volver con `?checkout=success` ve una confirmación; NUNCA se finge un pedido.
- Given sin clave, when paga, then ve "Próximamente: pago con Stripe" (honesto), sin el falso "reserva confirmada".
- Given un precio manipulado en el cliente, when se crea la sesión, then el importe se recomputa server-side desde el catálogo.
- Given el bundle de cliente, when se inspecciona, then `STRIPE_SECRET_KEY` NO aparece (solo server).

## Spec Change Log

- 2026-06-21 — Aprobada (ready-for-dev). Arquitectura: `createServerFn` en Vercel (no Supabase edge fn →
  sin deploy de Salvador); importe recomputado server-side; **fallback honesto "Próximamente"** si no hay
  clave → implementable SIN la key (arregla ya el checkout falso), redirect real al añadir `sk_test_` al
  env de Vercel. Modo test. §Stripe-B (webhook/pedido/QR/email) diferido a `deferred-work.md`.

- 2026-06-21 — Revisión adversarial (iter. 1). Núcleo OK (precio fiable server-side, secret aislado,
  copy honesto; auditor: "fully compliant"). Patches de higiene de inputs: `qty` acotado
  (`.int().positive().max(99)`), guard de `line_items` vacío antes de llamar a Stripe, y mensaje de
  error genérico al cliente (`console.error` del detalle solo en servidor — no filtrar internals).
  Diferido a §B/go-live: clave de idempotencia, verificación server-side de `?checkout=success` (clave
  en modo LIVE), y allowlist del `origin` (hoy solo afecta la propia sesión del comprador).

## Design Notes

- **`createServerFn` (no Supabase edge fn):** corre en Vercel con la app → se despliega en cada push, sin
  el `supabase functions deploy` de Salvador. El **webhook** (§B) sí necesita una ruta HTTP con **raw
  body** (`createServerFileRoute`) para verificar la firma de Stripe — por eso va aparte.
- **Claves:** `STRIPE_SECRET_KEY` (test) en el env de Vercel; equipo de confianza + nada importante en
  Stripe → no se sobre-aísla. Setup (crear cuenta Stripe test, qué env vars) se documenta aparte, sin valores.
- **Honestidad:** mientras no haya clave, el carrito dice la verdad ("Próximamente") en vez de fingir una compra.

## Verification

**Commands:**
- `bunx tsc --noEmit` -- sin errores.
- `bunx vitest run` -- pasan `checkout` (cartAmountCents) + los existentes.
- `bun run build` -- OK.

**Manual checks:**
- Sin `STRIPE_SECRET_KEY`: el carrito muestra "Próximamente: pago con Stripe" (no finge compra).
- Con `sk_test_…` en el env de Vercel (cuando David cree la cuenta): pagar con 4242 4242 4242 4242 → redirige a Stripe → vuelve a `?checkout=success`; el secreto no aparece en el bundle de cliente.

## Suggested Review Order

**Núcleo de seguridad (precio fiable + secreto aislado)**

- `createCheckout`: secret server-only (`process.env` en el handler), importe recomputado, validación zod (`qty` acotado), guards (line_items vacío, error genérico).
  [`checkout.server.ts:33`](../../src/lib/checkout.server.ts#L33)
- `cartAmountCents`: catálogo fiable; ignora el precio del cliente; id desconocido → throw.
  [`checkout.ts:33`](../../src/lib/checkout.ts#L33)

**Wiring del carrito**

- `handlePay`: `createCheckout` → redirect a Stripe / estado honesto "Próximamente" / error.
  [`cart-sheet.tsx:44`](../../src/components/cart-sheet.tsx#L44)
- Vuelta de Stripe (`?checkout=success|cancel`) con confirmación honesta de pago de test.
  [`landing.tsx:895`](../../src/routes/landing.tsx#L895)

**Periféricos**

- Tests del cálculo de importe (recompute, ignora precio cliente, id desconocido).
  [`checkout.test.ts:1`](../../src/lib/checkout.test.ts#L1)

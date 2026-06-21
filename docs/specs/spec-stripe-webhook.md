---
title: '§Stripe-B1 — Webhook de Stripe: persistir pedido + access_code (fulfillment)'
type: 'feature'
created: '2026-06-21'
status: 'done'
baseline_commit: '79923b2'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** §Stripe-A cobra en test, pero **no se persiste nada**: cuando Stripe confirma el pago no se
crea ningún pedido. Sin eso no hay registro de la compra ni código para activar la sala del juego.

**Approach:** Un **webhook** (ruta de servidor en Vercel, `createAPIFileRoute('/api/stripe-webhook')`,
con **raw body** para verificar la firma de Stripe). En `checkout.session.completed`: idempotente, crea
una fila en **`orders`** (status `pagado`, email, importes, `stripe_session_id`) y genera un
**`access_code`** único. El email de recibo + QR son **§Stripe-B2 (diferido)**.

## Product Decisions

- **Ruta API** `createFileRoute('/api/stripe-webhook')` con `server.handlers.POST` (no `createServerFn`: el webhook necesita el cuerpo crudo) -- corre en Vercel con la app, sin Supabase deploy. *(La spec decía `createAPIFileRoute`, que no existe en @tanstack/react-start 1.167.50 — ver Change Log.)*
- **Idempotencia por `stripe_session_id`**: si ya existe un pedido con ese id, no se duplica (se responde 200).
- **Escritura con la SERVICE ROLE key** de Supabase (solo servidor) para insertar en `orders` saltando RLS -- estándar para webhooks.
- **`access_code`** = código único corto (8 alfanum. legibles) -- enlazará con la activación de la sala (§B2/activación).
- Pedido = **cabecera** (email, `subtotal/total/shipping_cents`, `status='pagado'`, `stripe_session_id`, `access_code`). **`order_items`** (packs concretos) **diferido**.
- **Email de recibo + QR** = §Stripe-B2 (diferido).

## Boundaries & Constraints

**Always:** verificar SIEMPRE la firma (`stripe.webhooks.constructEvent` con el raw body y
`STRIPE_WEBHOOK_SECRET`); secretos solo server-side (`process.env`, nunca cliente/`VITE_`); responder
**2xx** rápido a Stripe incluso en no-ops (eventos ignorados → 200); idempotente (no duplicar pedidos);
tomar importes/email **de la sesión de Stripe** (no del cliente).

**Ask First (setup de David, secretos en env de Vercel):** `STRIPE_WEBHOOK_SECRET` (de un endpoint de
webhook que David crea en el dashboard de Stripe apuntando a `…/api/stripe-webhook`), y
`SUPABASE_SERVICE_ROLE_KEY` (para escribir `orders`). Cambiar el esquema de `orders` -- NO (usar columnas existentes).

**Never:** poner secretos en el cliente; confiar en importes del cliente; tocar edge functions del
juego, avatar ni migraciones; enviar email/QR aquí (es §B2); persistir pedidos en eventos no verificados.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Firma válida + `checkout.session.completed` | raw body + firma OK; sesión pagada | crea `orders` (status `pagado`, email/importes de la sesión, `stripe_session_id`, `access_code`); 200 | error de BD → 500 (Stripe reintentará) |
| Evento repetido (mismo `stripe_session_id`) | ya existe el pedido | NO duplica; responde 200 | — |
| Firma inválida / falta `STRIPE_WEBHOOK_SECRET` | body sin firma válida | 400, no se crea nada | log server-side |
| Otro tipo de evento | p.ej. `payment_intent.*` | 200 (ignorado), sin efecto | — |
| Falta `SUPABASE_SERVICE_ROLE_KEY` | secreto no configurado | 500 + log claro ("falta service key"); Stripe reintenta | no crashea |

</frozen-after-approval>

## Code Map

- `src/routes/api/stripe-webhook.ts` -- **NUEVO**: `createAPIFileRoute('/api/stripe-webhook')({ POST })`; verifica firma (raw body), maneja `checkout.session.completed`, inserta el pedido.
- `src/lib/orders.ts` -- **NUEVO**: lógica PURA — `generateAccessCode()` y `orderInsertFromSession(session)` → payload de `orders` Insert (email/importes/status/stripe_session_id/access_code).
- `src/lib/database.types.ts` -- `orders` Insert (email obligatorio; `subtotal/total/shipping_cents`; `status` enum `order_status`=`pagado`; `access_code`; `stripe_session_id`) y enum `order_status`.
- `src/lib/checkout.server.ts` -- §A crea la Checkout Session (contexto; el webhook lee la sesión).
- `src/lib/config.server.ts` -- patrón env server-only (`process.env` dentro del handler).
- `src/lib/supabase.ts` -- cliente anon (patrón); el webhook crea un cliente **admin** con la service key (`@supabase/supabase-js` ya es dep).

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/orders.ts` (NUEVO, PURO) -- `generateAccessCode(): string` (8 alfanum. sin caracteres ambiguos) y `orderInsertFromSession(session): OrdersInsert` que mapea `session.customer_details?.email ?? session.customer_email`, `amount_subtotal`/`amount_total`/`total_details.amount_shipping` → `*_cents`, `status:'pagado'`, `stripe_session_id: session.id`, `access_code`. Sin I/O (recibe la sesión ya obtenida).
- [x] `src/lib/orders.test.ts` (NUEVO) -- tests de `generateAccessCode` (longitud, alfabeto, unicidad razonable) y `orderInsertFromSession` (mapeo de importes/email/status; email ausente → maneja).
- [x] `src/routes/api/stripe-webhook.ts` (NUEVO) -- `createAPIFileRoute('/api/stripe-webhook')({ POST: async ({ request }) => … })`: lee `request.text()` (raw) + cabecera `stripe-signature`; `stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET)` (falta/!válido → 400). Si `event.type==='checkout.session.completed'`: cliente admin `createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY)`; comprobar `orders` por `stripe_session_id` (existe → 200); si no, `insert(orderInsertFromSession(session))`. Siempre 200 en eventos ignorados; 500 en error de BD; nunca exponer secretos.

**Acceptance Criteria:**
- Given una firma válida y `checkout.session.completed`, when llega el webhook, then se crea un `orders` con `status='pagado'`, email/importes de la sesión, `stripe_session_id` y un `access_code`, y responde 200.
- Given un segundo envío del mismo evento (mismo `stripe_session_id`), when llega, then NO se crea un pedido duplicado y responde 200.
- Given una firma inválida o sin `STRIPE_WEBHOOK_SECRET`, when llega, then responde 400 y no escribe nada.
- Given un tipo de evento no manejado, when llega, then responde 200 sin efecto.
- Given que `SUPABASE_SERVICE_ROLE_KEY` falta, when intenta escribir, then 500 + log claro (sin crashear el server).

## Spec Change Log

- 2026-06-21 — Aprobada (ready-for-dev). Webhook `createAPIFileRoute` (raw body, verificación de firma),
  idempotente por `stripe_session_id`, escritura en `orders` con la service key; `access_code` generado.
  `order_items` y el recibo (email + QR) = §Stripe-B2, diferido. Para PROBAR necesita
  `STRIPE_WEBHOOK_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` (los pone David); se construye sin ellos.

- 2026-06-21 — Implementación: `createAPIFileRoute` / `@tanstack/react-start/api` **no existe** en la
  versión instalada (1.167.50). La ruta API correcta es `createFileRoute('/api/stripe-webhook')({ server:
  { handlers: { POST: async ({ request }) => Response } } })` de `@tanstack/react-router` — comportamiento
  idéntico (Request crudo → Response, ideal para verificar la firma). Resto del diseño sin cambios.

- 2026-06-21 — Revisión adversarial (iter. 1): webhook + firma + idempotencia secuencial OK (auditor:
  compliant). Patch aplicado: comprobar **`payment_status === "paid"`** antes del fulfillment (no marcar
  'pagado' sesiones async no liquidadas; 200 si no está pagada). Diferidos a `deferred-work.md` (§B1
  robustez): `UNIQUE(stripe_session_id)`/`UNIQUE(access_code)` (migración → Salvador) + tratar violación
  única como 200, eventos de pago async, email vacío, sesgo de módulo/Math.random del access_code, y el
  500 ante config faltante.

## Design Notes

- **createAPIFileRoute** (de `@tanstack/react-start/api`): el handler recibe el `Request` crudo → `await
  request.text()` da el body sin parsear que exige `webhooks.constructEvent` para validar la firma.
- **Service role key**: el webhook es server-only; escribe `orders` con la service key (en env de Vercel)
  para no depender de políticas RLS de inserción anónima. Nunca llega al cliente.
- **Idempotencia**: Stripe puede reenviar un evento; el `stripe_session_id` (único por compra) es la
  clave natural para no duplicar. Si más adelante interesa, una tabla de eventos da dedupe más estricto.
- **`access_code`**: aquí solo se genera y guarda; su uso (QR + activación de la sala) es §B2/activación.

## Verification

**Commands:**
- `bunx tsc --noEmit` -- sin errores.
- `bunx vitest run` -- pasan `orders` (access_code + mapeo) + los existentes.
- `bun run build` -- OK (la ruta `/api/stripe-webhook` se incluye en el build de Nitro).

**Manual checks (cuando David configure el webhook):**
- Con `STRIPE_WEBHOOK_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` en Vercel y un endpoint de webhook en Stripe
  (o `stripe listen --forward-to .../api/stripe-webhook` en local): pagar con `4242…` → llega
  `checkout.session.completed` → aparece una fila en `orders` (status `pagado`, con `access_code`); reenviar
  el evento NO duplica.

## Suggested Review Order

**Núcleo del webhook (seguridad)**

- Ruta API + verificación de firma (raw body, `constructEventAsync`) + secretos solo server-side.
  [`stripe-webhook.ts:23`](../../src/routes/api/stripe-webhook.ts#L23)
- Solo fulfillment si `payment_status === "paid"`.
  [`stripe-webhook.ts:66`](../../src/routes/api/stripe-webhook.ts#L66)
- Idempotencia (`maybeSingle` por `stripe_session_id`) + insert con la service key.
  [`stripe-webhook.ts:88`](../../src/routes/api/stripe-webhook.ts#L88)

**Lógica pura del pedido**

- `orderInsertFromSession` — email/importes SIEMPRE de la sesión de Stripe.
  [`orders.ts:62`](../../src/lib/orders.ts#L62)
- `generateAccessCode`.
  [`orders.ts:17`](../../src/lib/orders.ts#L17)

**Periféricos**

- Tests del mapeo + access_code.
  [`orders.test.ts:1`](../../src/lib/orders.test.ts#L1)

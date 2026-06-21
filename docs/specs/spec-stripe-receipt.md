---
title: '§Stripe-B2 — Recibo de compra: email + QR del access_code'
type: 'feature'
created: '2026-06-21'
status: 'done'
baseline_commit: 'a78daf7'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** §Stripe-B1 crea el pedido (`orders` + `access_code`) pero el comprador **no recibe nada**: ni
recibo ni forma de usar su `access_code`. No hay cierre de la compra de cara al cliente.

**Approach:** Tras crear el pedido en el webhook, **enviar un email de recibo** (Resend) con el importe,
el `access_code`, un **enlace de activación** (`/activar?code=…`) y su **QR**. Fallback honesto: si no hay
`RESEND_API_KEY`, NO se envía (log) y el pedido igual queda guardado; el fallo de email NUNCA rompe el
fulfillment. La ruta `/activar` (canje) es OTRA feature: el QR/enlace solo codifican su URL.

## Product Decisions

- **Email vía Resend** (dep `resend` + `RESEND_API_KEY`); **fallback honesto**: sin key → no se envía, se loguea, el pedido queda guardado.
- **QR con `qrcode`** (dep) → **data-URL PNG** embebido en el email; **además** el **enlace de activación en texto** (siempre funciona aunque el cliente de correo bloquee imágenes).
- **Codifica** `${origin}/activar?code=${access_code}` -- `origin` se saca de `session.success_url` (lo fija §A), con fallback a `https://tastia.org`.
- **Honesto:** si `session.livemode === false` (test), el email indica que es un **pago de prueba**.
- **El envío NO debe romper el webhook**: va tras el insert exitoso, en try/catch; si falla, log + 200 igualmente (el pedido ya está guardado).
- **Idempotencia:** §B1 corta los duplicados ANTES de llegar aquí → el recibo se envía **una sola vez** por pedido.
- Lógica de construir el email (asunto/HTML) = **función PURA testeable**; el QR y el envío = I/O en el webhook.

## Boundaries & Constraints

**Always:** `RESEND_API_KEY` solo server-side (`process.env`, nunca cliente); el recibo se envía solo
tras un insert exitoso y dentro de try/catch (un fallo de email → log + el webhook responde 200);
respetar la cuota de Resend (free ~100/día) — un email por pedido; importe/email **de la sesión de Stripe**.

**Ask First (setup de David, env de Vercel):** `RESEND_API_KEY` y `RESEND_FROM` (remitente **verificado**
en Resend — dominio/email). Sin remitente verificado Resend rechaza el envío.

**Never:** romper el webhook/fulfillment por un fallo de email; reenviar el recibo (idempotente);
exponer secretos al cliente; tocar edge functions del juego, avatar, migraciones ni el esquema de
`orders`; implementar la ruta `/activar` aquí (solo se codifica su URL en el QR/enlace).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Pedido creado + `RESEND_API_KEY` | webhook tras insert OK | genera QR del `…/activar?code=…`, construye y envía el email de recibo al comprador; 200 | fallo de envío → log + 200 (pedido guardado) |
| Sin `RESEND_API_KEY` | secreto ausente | NO envía; log "email no configurado"; el pedido igual queda guardado; 200 | — |
| Modo test (`session.livemode === false`) | sesión de test | el email incluye nota honesta "pago de prueba" | — |
| Sin email del comprador | `email` vacío | no se envía (no hay destinatario); log; 200 | — |
| Evento duplicado | §B1 cortó antes | no se envía un segundo recibo | — |

</frozen-after-approval>

## Code Map

- `src/routes/api/stripe-webhook.ts` -- §B1: tras el insert exitoso, capturar el `access_code` en variable (hoy va inline en el insert), generar el QR, construir y enviar el recibo (try/catch, no rompe el 200).
- `src/lib/receipt.ts` -- **NUEVO**: lógica PURA `buildReceiptEmail({ to, accessCode, totalCents, activationUrl, qrDataUrl, livemode }) → { from, to, subject, html }`.
- `src/lib/receipt.test.ts` -- **NUEVO**: tests del builder.
- `src/lib/orders.ts` -- `generateAccessCode` (contexto; el code que va al QR/email).
- `src/lib/config.server.ts` -- patrón env server-only (`RESEND_API_KEY`, `RESEND_FROM`).
- `package.json` -- añadir deps `resend` y `qrcode`.

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- añadir `resend` y `qrcode` (+ `@types/qrcode` dev si hace falta).
- [x] `src/lib/receipt.ts` (NUEVO, PURO) -- `buildReceiptEmail(args)` → `{ from, to, subject, html }`: `from = process.env.RESEND_FROM ?? "Tastia <onboarding@resend.dev>"`; subject p.ej. "Tu cata Tastia — recibo y acceso"; HTML con importe (`totalCents/100 €`), `access_code`, **enlace** `activationUrl` (texto), `<img src={qrDataUrl}>` y, si `!livemode`, una nota "pago de prueba (no se ha cobrado dinero real)". Sin I/O.
- [x] `src/lib/receipt.test.ts` (NUEVO) -- el HTML incluye `access_code`, el `activationUrl` y la nota de prueba cuando `livemode=false` (y NO cuando `true`); `from` usa `RESEND_FROM` o el default; subject presente.
- [x] `src/routes/api/stripe-webhook.ts` -- tras el insert OK: `const origin = new URL(session.success_url ?? "https://tastia.org").origin` (fallback si falta); `const activationUrl = ${origin}/activar?code=${accessCode}`; `const qrDataUrl = await QRCode.toDataURL(activationUrl)`; si `process.env.RESEND_API_KEY` y hay `email` → `new Resend(key).emails.send(buildReceiptEmail({...}))` en **try/catch** (fallo → `console.error` + seguir); si no hay key → `console.warn` y seguir. Siempre 200. (Refactor: generar el `access_code` en una variable y usarla tanto en el insert como aquí.)

**Acceptance Criteria:**
- Given un pedido creado y `RESEND_API_KEY` configurada, when termina el webhook, then se envía un email al comprador con su `access_code`, el enlace `…/activar?code=…` y un QR, y responde 200.
- Given sin `RESEND_API_KEY`, when termina el webhook, then NO se envía email (log) y el pedido sigue guardado (200).
- Given que el envío de email falla, when ocurre, then el webhook responde 200 igualmente (el fulfillment no se rompe).
- Given una sesión de test (`livemode=false`), when se construye el email, then incluye la nota honesta de "pago de prueba".
- Given un evento duplicado, when llega, then NO se envía un segundo recibo (§B1 cortó antes).

## Spec Change Log

- 2026-06-21 — Aprobada (ready-for-dev). Recibo vía Resend + QR (`qrcode` data-URL) tras el insert del
  webhook; enlace de activación en texto + QR; fallback honesto sin `RESEND_API_KEY` (no envía, log,
  pedido guardado); el fallo de email no rompe el fulfillment (200). `/activar` es otra feature (el QR
  solo codifica su URL). Para PROBAR: `RESEND_API_KEY` + `RESEND_FROM` verificado (David).

- 2026-06-21 — Implementado + revisión adversarial (2 agentes; auditor: compliant, sin violaciones). Sin
  parches de código: el email es best-effort (todo el envío en try/catch → 200), el builder es puro,
  secretos solo server-side, sin inyección (los valores son propios/de Stripe, el email del comprador solo
  va en `to`). Deps `resend@6` + `qrcode@1.5` añadidas. Diferidos a `deferred-work.md` (§B2 robustez):
  derivar el `origin` de un env `SITE_URL` en vez de `success_url`; ligar el `access_code` a identidad en
  `/activar` (un email tecleado mal enviaría el código a otra persona); fallo transitorio de Resend sin
  reintento → alerta/outbox (el pedido queda guardado, recuperable). `RESEND_FROM` verificado = go-live.

## Suggested Review Order

**Lógica pura (email)**

- `buildReceiptEmail` — importe + `access_code` + enlace de activación (texto) + QR `<img>` + nota honesta de prueba.
  [`receipt.ts:26`](../../src/lib/receipt.ts#L26)
- Tests del builder.
  [`receipt.test.ts:1`](../../src/lib/receipt.test.ts#L1)

**Integración (webhook, best-effort)**

- Recibo tras el insert OK, en try/catch que nunca propaga (fallback sin email / sin `RESEND_API_KEY`;
  `origin` de `success_url`; QR; envío Resend; siempre 200).
  [`stripe-webhook.ts:116`](../../src/routes/api/stripe-webhook.ts#L116)

## Design Notes

- **Enlace en texto + QR**: muchos clientes de correo bloquean imágenes `data:`; por eso el `activationUrl`
  va también como **enlace de texto** (siempre funciona) y el QR es un extra para escanear desde el móvil.
- **`origin` desde `success_url`**: §A fija `success_url = ${origin}/landing?checkout=success`; parsear su
  origin evita una env var extra para la URL pública (con fallback a `https://tastia.org`).
- **Email no bloquea el fulfillment**: el pedido ya está en `orders`; el recibo es best-effort (try/catch
  → 200) para no provocar reintentos de Stripe por un fallo de email.

## Verification

**Commands:**
- `bunx tsc --noEmit` -- sin errores.
- `bunx vitest run` -- pasan `receipt` + los existentes.
- `bun run build` -- OK.

**Manual checks (cuando David configure Resend):**
- Con `RESEND_API_KEY` + `RESEND_FROM` (remitente verificado) en Vercel y el webhook activo: pagar con
  `4242…` → llega un email de recibo con el `access_code`, el enlace `…/activar?code=…` y un QR; en test,
  con la nota de "pago de prueba". Sin `RESEND_API_KEY`: no llega email pero el pedido se guarda igual.

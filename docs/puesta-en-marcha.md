# Puesta en marcha — activar el bucle comercio→juego (modo TEST)

> Todo funciona en **modo TEST de Stripe** (no se cobra dinero real). NO hace falta pasar a LIVE para
> probar el flujo completo: compra → pedido → email con QR → `/activar` → sala.
> Sin estos secretos, cada parte cae en su **fallback honesto** y nada se rompe.

## Qué hace cada secreto

| Secreto (en Vercel) | Lo necesita | Sin él |
|---|---|---|
| `STRIPE_SECRET_KEY` (`sk_test_…`) | §A — crear el pago | El carrito muestra "Próximamente" |
| `STRIPE_WEBHOOK_SECRET` (`whsec_…`) | §B1 — recibir el pago y guardar el pedido | El pago redirige pero NO se guarda el pedido |
| `SUPABASE_SERVICE_ROLE_KEY` | §B1 guardar `orders` + §Activar validar | No se guarda el pedido; `/activar` dice "no disponible" |
| `RESEND_TASTIA_API_KEY` | §B2 — enviar el email de recibo + QR | No llega email (el pedido igual se guarda) |
| `RESEND_FROM` (opcional) | remitente del email | Usa `Tastia <onboarding@resend.dev>` (solo entrega a tu propio email de Resend) |

> `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` ya están en Vercel (la app ya funciona). El webhook
> reutiliza `VITE_SUPABASE_URL`, así que NO hace falta añadir `SUPABASE_URL`.

## Paso 0 — Asegúrate de estar en MODO TEST en Stripe

En el dashboard de Stripe, arriba a la derecha, el toggle **"Test mode" / "Modo de prueba" debe estar ON**.
Todas las claves y el webhook de abajo serán de test.

## Paso 1 — Recoge los valores (de tus paneles)

1. **`SUPABASE_SERVICE_ROLE_KEY`** — Supabase → proyecto Tastia → **Project Settings → API → Project API
   keys → `service_role`** (clic en "Reveal"). ⚠️ Es una clave muy potente: solo va en Vercel (server-side),
   nunca en el cliente ni en git.
2. **`RESEND_TASTIA_API_KEY`** — Resend → **API Keys → Create API Key** (permiso de envío). Copia `re_…`.
   - **Remitente:** para una primera prueba puedes dejar `RESEND_FROM` sin poner (usa `onboarding@resend.dev`,
     que **solo entrega a la dirección de tu cuenta de Resend** — p. ej. david@freedolia.com). Para enviar a
     cualquier comprador, verifica un dominio en Resend → Domains, y pon `RESEND_FROM = "Tastia <hola@tudominio>"`.
3. **`STRIPE_SECRET_KEY`** — ya la tienes (`sk_test_…`). (Stripe → Developers → API keys, en modo test.)
4. **`STRIPE_WEBHOOK_SECRET`** — créalo:
   - Stripe (modo test) → **Developers → Webhooks → Add endpoint**.
   - **Endpoint URL:** `https://tastia.org/api/stripe-webhook` (el dominio de producción del proyecto en Vercel).
   - **Events to send:** selecciona **`checkout.session.completed`**.
   - **Add endpoint** → en la página del endpoint, **Signing secret → Reveal** → copia `whsec_…`.

## Paso 2 — Ponlos en Vercel

Vercel → proyecto **Tastia** → **Settings → Environment Variables**. Añade cada uno para
**Production** (y Preview si quieres probar en previews):

```
STRIPE_SECRET_KEY            = sk_test_…
STRIPE_WEBHOOK_SECRET        = whsec_…
SUPABASE_SERVICE_ROLE_KEY    = (la service_role del paso 1.1)
RESEND_TASTIA_API_KEY               = re_…
RESEND_FROM                  = Tastia <onboarding@resend.dev>   (opcional)
```

## Paso 3 — Redeploy

Las variables nuevas solo aplican en un **despliegue nuevo**. En Vercel → Deployments → en el último,
menú **… → Redeploy** (o haz un push a `main`). Espera a que termine.

## Paso 4 — Prueba el flujo completo (tarjeta de test)

1. Abre **tastia.org** → tienda → elige un pack → **Pagar**. Usa tu email de Resend (david@freedolia.com)
   si quieres recibir el email con `onboarding@resend.dev`.
2. Paga con **`4242 4242 4242 4242`** · caducidad futura (12/34) · CVC 123 · CP cualquiera.
3. Vuelves con `?checkout=success`.
4. **Supabase → tabla `orders`**: debe haber una fila nueva (`status='pagado'`, con `access_code`).
5. **Tu email**: llega el recibo con el importe, el `access_code`, el enlace y el **QR**.
6. Abre **`/activar?code=<access_code>`** (o escanea el QR) → "✓ Acceso válido" → **"Empezar la cata"** →
   te lleva a `/room/<code>` como host. Comparte ese código y entra desde otro dispositivo en `/play/<code>`.

> Reenviar el mismo evento desde Stripe (Webhooks → el endpoint → un evento → "Resend") **no** crea un
> pedido duplicado (idempotente por `stripe_session_id`) y **no** reenvía el email.

## Para producción (LIVE) más adelante

Repetir con las claves **live** (`sk_live_…` + un webhook live → `whsec_…` live), y **antes** abordar los
endurecimientos de `deferred-work.md` (verificar el pago server-side, rate-limit de `/activar`, caducidad
de activación, etc.) y el compliance de alcohol (age gate, impuestos, envío).

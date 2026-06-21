# Activar Stripe (modo TEST) — guía turnkey

*El código de §Stripe-A ya está en `dev`. Para **activar** el checkout solo hay que poner la clave de
test en el env de Vercel — **cero cambios de código**. Sin la clave, el carrito muestra "Próximamente"
(honesto). Tiempo: ~5 min.*

## Pasos

1. **Cuenta Stripe + modo test**
   - Entra en https://dashboard.stripe.com (crea cuenta si no tienes).
   - Asegúrate de que el toggle **"Test mode"** (arriba a la derecha) está **ON**.

2. **Copiar la clave secreta de test**
   - Developers → **API keys** → copia la **Secret key** → empieza por **`sk_test_…`**.
   - (NO hace falta la publishable key para este flujo; el checkout es hosted.)

3. **Ponerla en Vercel** (proyecto Tastia)
   - Vercel → proyecto **Tastia** → **Settings → Environment Variables**.
   - Add: nombre **`STRIPE_SECRET_KEY`**, valor `sk_test_…`.
   - Entornos: marca **Preview** (para probar en el preview de `dev`) y **Production** (para tastia.org).
   - Save.

4. **Redeploy**
   - Vercel aplica los env vars en el **siguiente deploy**. Haz **Redeploy** del último (o haz un push).
   - *(No requiere ningún `supabase functions deploy` — el checkout corre como función de la propia app.)*

## Probar (modo test, sin cobro real)

1. Abre el preview de `dev` (o tastia.org) → elige un pack → **Pagar**.
2. Te redirige a **Stripe Checkout**. Paga con la tarjeta de test:
   - Nº **4242 4242 4242 4242** · caducidad cualquiera futura (p.ej. 12/34) · CVC cualquiera (123) · CP cualquiera.
3. Vuelves a la web con **`?checkout=success`** → confirmación honesta de "pago de prueba".

## Notas honestas

- **No se cobra dinero real** (es modo test). Las tarjetas reales NO funcionan en test.
- **El pedido aún NO se guarda** ni se envía email: eso es **§Stripe-B** (webhook + `orders` + `access_code`
  + QR + email), diferido (`deferred-work.md`). La pantalla de éxito lo dice claramente.
- Mientras no exista `STRIPE_SECRET_KEY`, el carrito muestra **"Próximamente: pago con Stripe"** (no finge
  ninguna compra).
- La clave vive **solo** en el env de Vercel (server-side); **nunca** llega al navegador ni al repo.

## Para producción (live) más adelante

- Repetir con la **Secret key de modo live** (`sk_live_…`) — pero **antes** conviene tener §Stripe-B
  (pedido/recibo) y la verificación server-side de `?checkout=success`, y revisar legal/age-gate.

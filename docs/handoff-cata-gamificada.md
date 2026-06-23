# Cata gamificada (Tastia) — Estado y traspaso

> Documento de cierre de nuestro carril (cliente del juego + comercio + admin + landing).
> Fecha: 2026-06-21. Producción = rama `main` (Vercel proyecto `tastia`, dominio tastia.org).
> Todo se construyó **feature a feature** (spec → dev → revisión adversarial → PR a `dev` → `dev`→`main`),
> con copia honesta (sin fingir lo no construido).

---

## 1. Resumen ejecutivo

Tastia es una plataforma de **cata de vino en grupo, gamificada y en vivo** (multijugador por Supabase
Realtime, host-autoritario) + **packs físicos** con compra online. Estado actual:

- **El bucle de negocio de punta a punta está construido y desplegado en producción:**
  comprar un pack → recibir pedido + código → recibo con QR → activar la sala → jugar la cata.
- **El panel de administración del juego está completo** (ajustes, banco de preguntas, clasificación de vinos).
- Lo que **falta** son, sobre todo, piezas que dependen de **Salvador** (BD/edge functions/RLS) o de
  **activar/probar** secretos en tus cuentas (Stripe/Resend/Supabase) — no de más código en nuestro carril.

---

## 2. ✅ Hecho y EN PRODUCCIÓN

### Juego (cliente, host-autoritario)
- Motor de sesión por rondas + presence/broadcast (Realtime); rutas `/room/$code` (Sala/host) y `/play/$code` (jugador).
- Motor de quiz, temporizador por fase, puntuación, taxonomía y pregunta de clasificación.
- **Quiz desde la BD (§5.6b-A, #13):** consume `quiz-bootstrap`/`quiz-close` (de Salvador) con **fallback total a demo** si no hay deploy/Supabase. Anti-spoiler: el bootstrap no lleva respuestas; el reveal llega en el cierre.
- **Persistencia de sesión (§5.6b-B, #14):** `session-finish` al podio final (sesión + foto del ganador → ranking).
- **i18n** ES/CA/EN/FR (incl. conversaciones de cliente).

### Admin del juego — `/admin` (tras login)
- **§5.8a (#12):** editor de `game_settings` (global + por pack) + panel de readiness.
- **§5.8b (#21):** CRUD del banco de preguntas (`game_questions`) por vino/fase (`options` como `string[]`, `correct_answer` ∈ opciones — contrato con `quiz-source.ts`).
- **§5.8c (#22):** clasificación de vinos (`wines.category` + `classification_id`) con coherencia tipo↔clasificación.
- Patrón común: escritura vía **cliente autenticado + RLS** con `.select("id")` → 0 filas = "sin permiso" (honesto, sin service key).

### Comercio → juego (modo TEST de Stripe)
- **§Stripe-A (#15):** checkout en modo test (server fn en Vercel) + fallback honesto "Próximamente".
- **§Stripe-B1 (#16):** webhook → persiste `orders` (status `pagado` + `access_code`), idempotente por `stripe_session_id`, solo `payment_status='paid'`.
- **§Stripe-B2 (#17):** recibo por email (Resend) + **QR** del `access_code`, best-effort (un fallo de email NO rompe el fulfillment).
- **§Activar (#18):** ruta pública `/activar` que valida el `access_code` (server fn + service key, solo `pagado`) → "Empezar la cata" como host en `/room/<code>`. **Cierra el bucle.**
- **Fix (#19):** la env de Resend en Vercel se llama `RESEND_TASTIA_API_KEY` (el código la lee con fallback a `RESEND_API_KEY`).
- Promociones a producción: **#20** (juego + comercio) y **#23** (fix Resend + admin).

### Verificación
`bunx tsc --noEmit` (0 errores) · `bunx vitest run` (**147 tests**) · `bun run build` — verdes.

---

## 3. ⏳ Pendiente — por responsable

### A) Tú (David) — activar / probar (modo TEST, sin LIVE)
Guía paso a paso: `docs/puesta-en-marcha.md`.
- Poner en Vercel (Production) los secretos de test: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_TASTIA_API_KEY` → redeploy → compra de test con `4242…`.
- **Email §B2 (causa raíz arreglada en código):** el bug era que el webhook descartaba el `{ data, error }` de Resend, así que un rechazo (remitente `onboarding@resend.dev` solo entrega al dueño de la cuenta, o quota) pasaba en silencio. Ya se loguea el motivo exacto. **Para que entregue de verdad, te queda (sin código):** verificar un dominio en Resend + poner `RESEND_FROM="Tastia <algo@tu-dominio>"` en Vercel (Production) → redeploy → compra NUEVA. Detalle en `deferred-work.md` §B2.

### B) Salvador — BD / edge functions / RLS
- **RLS de escritura para admins** en `game_settings` / `game_questions` / `wines`: sin esa policy, el admin (§5.8a/b/c) muestra honestamente "sin permiso" y no guarda. (El `.select("id")` lo delata, no rompe nada.)
- **Edge functions ✅ DESPLEGADAS EN PROD** (23-jun, carril nuestro) en `supabase/functions/` (`quiz-bootstrap` v4 · `quiz-close`/`session-finish` v3), conforme al contrato y a la derivación FR-12. Smoke-test en vivo OK: `quiz-bootstrap`→200 con `{settings, wines, questions}` **sin** respuestas; `verify_jwt` acepta la publishable key (el cliente anónimo no se bloquea). El deploy va `--project-ref tyuehzsqvjpjysxdihsh` **desde la raíz del repo** (los imports de `_shared/` se resuelven contra el CWD). Falta solo **validar e2e desde la BD** con datos reales. Ver `supabase/functions/README.md`.
- **Migraciones de endurecimiento:** ✅ `0013_orders_hardening.sql` **APLICADA A PROD** (22-jun, vía MCP): `UNIQUE(stripe_session_id)` + `activation_expires_at` verificados en vivo (`access_code` ya era UNIQUE). Verificado además que el esquema del juego (`game_settings`/`game_questions`+`fase`/`game_sessions`/`players`/`wine_classifications`/`order_wines`), las RLS `admin_all_*` y **1 admin registrado** YA están en prod → **la parte de BD/RLS de Salvador está hecha**. Pendiente real: ✅ **3 edge functions ya desplegadas en prod** (23-jun); solo queda la **validación e2e**. La **tabla de sesión de sala §5.9** (persistencia del estado EN VIVO / reloj en servidor) NO se construye aún: contradice las specs congeladas (estado en vivo efímero a propósito) y depende de la **pregunta abierta de cliente #6** (¿la sesión pausa+reanuda al recaer el host?).

### C) Andrés — avatar-sommelier (§5.4)
- Integración del avatar + voz (iframe en la Sala). Fuera de nuestro carril.

### D) Nuestro carril — diferido CON MOTIVO (no son guanys netos ahora)
- **Rate-limit de `/activar`:** anti-enumeración; necesita un **store** (KV/Upstash/Supabase), no es solo código. Mitigado hoy por el espacio de códigos (31⁸ ≈ 8,5·10¹¹). Mejor se cierra junto al `room_code` fresco.
- **Anti-spoiler host-only:** sacar el motor **demo** (`DEMO_WINES`/`getQuestion`) del bundle de `/play` con `import()` dinámico. Riesgo real bajo (son datos demo; las respuestas reales viven en la edge function). **Diferido por decisión tuya.**
- **Timer en pestaña de fondo:** el cierre del quiz depende de un `setTimeout` del host (se estrangula si la pestaña no está visible). La Sala vive en primer plano, así que es de bajo impacto; el arreglo "de verdad" es **mover el reloj al servidor** (§5.9, con Salvador), no el pegat de `visibilitychange`.

> Todos los pendientes están anotados en `docs/specs/deferred-work.md` con el detalle exacto para reanudar.

---

## 4. Mapa de despliegue y ramas

- **Producción = `main`** (Vercel proyecto `tastia`, plan Hobby) → tastia.org. `dev` y otras ramas = previews.
- **Flujo (regla dura):** `feat/*` → PR a `dev` → `dev`→`main` para publicar. Nunca commit directo a `main`.
- Supabase `tyuehzsqvjpjysxdihsh` (cuenta separada). Specs en `docs/specs/`; diferidos en `docs/specs/deferred-work.md`; estado vivo en `docs/ESTADO-cata-gamificada.md`; activación en `docs/puesta-en-marcha.md`.

---

## 5. Roadmap — secuencia y responsables

Nuestro carril (cliente del juego + comercio + admin + landing) está **cerrado**. A partir de aquí, en
**paralelo** donde se pueda:

### Vía crítica
1. **Backend funcional — Salvador (BD / edge / RLS).** Sin esto el juego corre en demo y el admin no guarda.
   - **Validar** las **edge functions** `quiz-bootstrap` / `quiz-close` / `session-finish` — ✅ **ya desplegadas en prod** (23-jun, carril nuestro); solo queda la validación e2e.
   - **RLS de escritura para admins** en `game_settings` / `game_questions` / `wines` (hoy el admin muestra "sin permiso" si faltan).
   - **Migraciones de endurecimiento:** `UNIQUE(stripe_session_id)` + `UNIQUE(access_code)` en `orders`; `activation_expires_at` (caducidad); tabla de sesión de sala (persistencia / reloj en servidor, §5.9).
   - **Ficha de cata server-side para el avatar** (`avatar-brief` o equivalente): notas + pistas + identidad secreta del vino, sin exponerla a los móviles.
2. **Avatar-sommelier — Andrés (§5.4, Workstream C).** Guía completa en **`docs/guion-avatar-sommelier.md`**
   (anclada en la máquina de estados real). Spike de proveedor (latencia <300 ms) + voz ElevenLabs (ES) +
   cerebro LLM (ficha de sesión + anti-spoiler) + 1 stream por grupo. Depende de la ficha server-side (con Salvador).

### Validación y diseño (tras nuestro carril)
3. **Revisión end-to-end — Ignacio.** Validar el flujo completo con datos/secretos reales: compra (test) →
   pedido → `/activar` → sala → juego desde la BD → podio; multijugador (presence, reconexión, host ausente);
   el admin (§5.8a/b/c). Reportar regresiones a quien corresponda por carril.
4. **Diseño + diseño a producción — Quique.** Revisión de diseño y sistema premium/anti-pompós; la **Sala**
   (con el avatar), la **tienda** y el **companion móvil**; llevar el diseño a producción.

### Activación / negocio
5. **David.** Poner los secretos de **test** en Vercel. Decisiones de negocio: compliance de alcohol
   (age gate, impuestos, envío), pricing y sourcing de vinos. **Stripe se queda en TEST/demo**
   (decidido 22-jun-2026): sin claves LIVE ni cobro real; el bucle de compra usa tarjetas de prueba.
   (Email §B2: causa raíz ya arreglada en código; solo falta `RESEND_FROM` verificado — opcional, no bloquea.)

### Pipeline de entrega (regla)
`feat/*` → PR a `dev` → revisión adversarial → `dev`→`main` (producción). Cada carril valida lo suyo;
**Ignacio** hace el e2e y **Quique** el pase de diseño a producción.

---

## 6. Conclusión

Nuestro carril (cliente del juego + comercio + admin + landing) está **completo y en producción**. Lo que
queda son blocantes reales que **no son más código nuestro**: activar/probar secretos (tú) y BD/edge
functions/RLS/migraciones (Salvador). El producto se puede **demostrar hoy**: el juego abriendo
`/room/<código>`, y el bucle de compra completo en cuanto estén los secretos de test en Vercel.

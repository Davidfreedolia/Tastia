# 🍷 Tastia — Estado completo del proyecto

> **Documento maestro** del estado de la cata gamificada. Punto de entrada único: enlaza a los documentos
> de detalle. _Última actualización: 2026-06-22._
> Producción = rama `main` (Vercel, dominio **tastia.org**) · Integración = `dev`.

---

## 1. Resumen ejecutivo

**Tastia** es una plataforma de **cata de vino en grupo, gamificada y en vivo** (multijugador por Supabase
Realtime, host-autoritario) con **packs físicos** a domicilio y un **sommelier-avatar de IA** (Tasti) que
modera la sesión. Proyecto cooperativo de 5 personas.

**Dónde estamos:** el **bucle de negocio de punta a punta** (comprar → pedido → recibo con QR → activar la
sala → jugar la cata → podio) está **construido y desplegado en producción**, junto con el **panel de
administración del juego** completo. Lo que queda son piezas que dependen de **Salvador** (BD/edge/RLS),
del **avatar** (Andrés), de la **validación** (Ignacio) y el **diseño** (Quique), o de **activar/probar**
secretos en cuentas de David (Stripe/Resend/Supabase).

---

## 2. Estado de un vistazo

| Área | Estado | Dónde |
|------|--------|-------|
| 🎮 Motor del juego (rondas, quiz, puntuación, temporizador) | ✅ En producción | `src/lib/session.ts`, `use-room-channel.ts`, `/room`//`/play` |
| 🧠 Quiz desde la BD + persistencia de sesión | ✅ En producción (con fallback demo) | `quiz-source.ts`, `session-finish.ts` |
| 🛒 Comercio Stripe (checkout · webhook · recibo · activar) | ✅ En producción (modo TEST) | `checkout.server.ts`, `api/stripe-webhook.ts`, `receipt.ts`, `/activar` |
| 🛠️ Admin del juego (ajustes · preguntas · clasificación) | ✅ En producción | `/admin`, `game-*.ts`, `wine-classification.ts` |
| 🔒 Anti-spoiler (motor demo host-only) | ✅ En producción | `use-room-channel.ts` |
| 🌍 i18n (ES/CA/EN/FR) | ✅ En producción | `i18n.tsx` |
| 🤖 Avatar-sommelier (Tasti) | 📋 Guías listas, por construir | `docs/guion-*.md` (Andrés) |
| 🗄️ Edge functions del juego (bootstrap/close/finish) | ✅ Desplegadas en prod (23-jun) | `supabase/functions/` |
| 🗄️ RLS escritura admin + migraciones de endurecimiento | ⏳ Pendiente | Salvador |
| ✅ Revisión end-to-end | ⏳ Pendiente | Ignacio |
| 🎨 Diseño + diseño a producción | ⏳ Pendiente | Quique |
| 🔑 Activar/probar secretos + email §B2 | ⏳ Pendiente | David |

---

## 3. ✅ Hecho y en producción

### 🎮 Juego (cliente, host-autoritario)
- Máquina de estados por rondas: `lobby → playing (vino × fase vista/olfato/gusto/gamificación, sub-paso quiz/reveal) → wine_podium → final_podium`.
- Presence + broadcast (Realtime); rutas `/room/$code` (Sala/host) y `/play/$code` (jugador).
- Quiz determinista, temporizador por fase, puntuación con bonus, taxonomía y pregunta de clasificación.
- **Quiz desde la BD** (consume `quiz-bootstrap`/`quiz-close` con **fallback total a demo**) · **persistencia** al podio (`session-finish` → ranking).
- **Anti-spoiler:** las respuestas demo viven en un chunk host-only; el bundle de `/play` no las contiene.

### 🛒 Comercio → juego (Stripe, modo TEST)
- **§Stripe-A** checkout (server fn en Vercel) + fallback honesto.
- **§Stripe-B1** webhook → persiste `orders` (`pagado` + `access_code`), idempotente, solo `payment_status='paid'`.
- **§Stripe-B2** recibo por email (Resend) + **QR**, best-effort (no rompe el fulfillment).
- **§Activar** ruta pública `/activar`: valida el `access_code` → "Empezar la cata" como host.

### 🛠️ Admin del juego — `/admin`
- **§5.8a** ajustes (`game_settings`) + readiness · **§5.8b** banco de preguntas (`game_questions`) · **§5.8c** clasificación de vinos.
- Patrón: cliente autenticado + RLS + `.select("id")` → "sin permiso" honesto (sin service key).

> **Disciplina:** todo pasó **spec → dev → revisión adversarial → PR a `dev` → `dev`→`main`**. PRs de la
> última tanda: **#15–#25** (comercio, admin, anti-spoiler, fix Resend, promociones). tsc + 147 tests + build verdes.

---

## 4. 📚 Documentación

| Documento | Para qué |
|-----------|----------|
| **`ESTADO-COMPLETO-Tastia.md`** (este) | Estado maestro, punto de entrada |
| `handoff-cata-gamificada.md` | Traspaso + **roadmap** con responsables (§5) |
| `ESTADO-cata-gamificada.md` | Estado vivo (tabla de features + PRs) |
| `puesta-en-marcha.md` | Activar el bucle en modo TEST (secretos + prueba `4242…`) |
| `guion-avatar-sommelier.md` | Avatar: **cuándo** actúa (anclado en la máquina de estados) |
| `guion-presentacion-avatar.md` | Avatar: **qué dice** Tasti (ES/EN, bilingüe) |
| `guion-ejemplo-cata.md` | Avatar: **ejemplo** de una cata completa (demo) |
| `specs/deferred-work.md` | Todo lo diferido, con el detalle para reanudar |
| `specs/spec-*.md` | Una spec por feature (estado `done`) |
| `edge-functions-contract.md` · `integracion-bd-checklist.md` | Contrato cliente↔backend (con Salvador) |

---

## 5. ⏳ Pendiente — por responsable

| Responsable | Pendiente |
|-------------|-----------|
| **Salvador** (BD/edge/RLS) | **Carril casi cerrado.** ✅ Esquema del juego + RLS `admin_all_*` + 1 admin registrado + `0013` (índice único + `activation_expires_at`) **verificados/aplicados en prod** (22-jun). ✅ **3 edge functions desplegadas en prod** (23-jun; smoke-test `quiz-bootstrap`→200, `verify_jwt` acepta la publishable key). Falta solo la **validación e2e con datos reales** (Ignacio). NO se construye aún la **tabla de sesión de sala §5.9** (estado en vivo): contradice specs congeladas + depende de pregunta de cliente #6. **Ficha server-side del avatar** = bloqueada por Andrés |
| **Andrés** (avatar §5.4) | Construir Tasti siguiendo `guion-*.md`: spike de proveedor (<300 ms) + voz ElevenLabs (ES/EN) + cerebro LLM + 1 stream |
| **Ignacio** | **Revisión end-to-end** con datos/secretos reales: compra→activar→sala→juego desde BD→podio; multijugador; admin |
| **Quique** | **Revisión de diseño** + sistema premium + llevar el **diseño a producción** (Sala/avatar, tienda, companion) |
| **David** | Secretos de **test** en Vercel · **email §B2: causa raíz arreglada en código** → solo falta verificar dominio en Resend + `RESEND_FROM` en Vercel · compliance de alcohol, pricing, sourcing · **Stripe se queda en TEST/demo** (decidido 22-jun-2026: sin claves LIVE, sin cobro real; el bucle de compra usa tarjetas de prueba) |

> El **email §B2** tenía un bug de causa raíz **ya arreglado**: el webhook descartaba el `{ data, error }`
> de Resend, así que un rechazo (remitente de prueba que solo entrega al dueño, o quota) pasaba en silencio.
> Ahora se loguea el motivo. Para que entregue, falta (David, sin código): dominio verificado en Resend +
> `RESEND_FROM` en Vercel. Detalle en `deferred-work.md` §B2.

---

## 6. 🗺️ Roadmap (secuencia)

1. **Backend funcional** (Salvador) — vía crítica: sin esto el juego corre en demo y el admin no guarda. Las **edge functions ya están desplegadas en prod** (23-jun) y el esquema/RLS del juego + `0013` están aplicados → el backend ya es funcional. Queda la validación e2e.
2. **Avatar Tasti** (Andrés) — en paralelo; depende de la ficha server-side de Salvador.
3. **Revisión end-to-end** (Ignacio) — tras nuestro carril, con todo conectado.
4. **Diseño a producción** (Quique).
5. **Activación / negocio** (David) — secretos test, email, compliance; **Stripe se queda en TEST/demo** (sin go-live).

**Pipeline:** `feat/*` → PR a `dev` → revisión adversarial → `dev`→`main`. Ignacio hace el e2e; Quique el pase de diseño a producción.

---

## 7. 👥 Equipo y carriles

- **Salvador** — BD + edge functions + RLS (backend).
- **Andrés** — avatar-sommelier Tasti (§5.4) en la Sala.
- **Ignacio** — revisión end-to-end.
- **Quique** — diseño + diseño a producción.
- **David / nosotros** — bucle de juego cliente + comercio + admin + integración + landing.

---

## 8. 🚀 Despliegue y ramas

- **Producción = `main`** (Vercel proyecto `tastia`, plan Hobby) → tastia.org. `dev` y otras ramas = previews.
- **Regla dura:** `feat/*` → PR a `dev` → `dev`→`main` para publicar. **Nunca** commit directo a `main`.
- Supabase **`tyuehzsqvjpjysxdihsh`** (cuenta separada). Envs de comercio en Vercel: `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_TASTIA_API_KEY`.
- _Estado de ramas hoy:_ `dev` va por delante de `main` solo en **documentación** (guiones del avatar +
  este estado); el código de `main` está al día (hasta #25).

---

## 9. ▶️ Cómo reanudar (punteros rápidos)

- **Probar el bucle en TEST:** `puesta-en-marcha.md` (poner secretos en Vercel + redeploy + compra `4242…`).
- **Construir el avatar:** `guion-avatar-sommelier.md` (cuándo) + `guion-presentacion-avatar.md` (qué dice) + `guion-ejemplo-cata.md` (demo).
- **Backend (Salvador):** `supabase/functions/` (edge functions implementadas + README de deploy) · `edge-functions-contract.md` + `deferred-work.md` (RLS, migraciones).
- **Qué falta y de quién:** `handoff-cata-gamificada.md` §5 (roadmap).

---

## 10. 🤖 El avatar Tasti — de un vistazo

- **Nombre:** Tasti. **Dónde vive:** solo en la Sala (1 stream por grupo, control de coste).
- **Cómo actúa:** reacciona al `RoomState` (no decide el tiempo); guía cada fase y **revela solo en el `reveal`** (anti-spoiler).
- **Qué dice:** guion bilingüe ES/EN, tono cálido y anti-pompós ("aquí no hay examen ni respuestas tontas").
- **Lo que necesita:** ficha de cata server-side (con Salvador) + proveedor de avatar + voz ElevenLabs + cerebro LLM.

---

_Fin del documento maestro. Para el detalle de cada punto, abre el documento enlazado en §4._

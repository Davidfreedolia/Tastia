# Deferred work — Cata gamificada

Hallazgos de la revisión adversarial de `spec-estructura-sesion-rondas.md` que NO son de este cambio
(preexistentes / arquitectónicos), para abordar más adelante.

## C — Estado de sesión efímero: recarga del host / dos hosts resetean la sala
- Si el host (Sala) recarga, o se abre una segunda pestaña `/room/:code`, su estado vuelve a `lobby`
  (estado solo en memoria) y, al difundirlo, puede arrastrar a toda la sala al lobby.
- Causa: el estado de la sesión es **efímero a propósito** (decisión *Ask-First* del spec: no persistir
  en BD salvo indicación). Arreglo real = **persistir la sesión** (tabla `tasting_sessions`, máquina de
  estados autoritativa en BD/Edge Function) + **identidad de jugador persistida** (localStorage) para
  conservar puntos en reconexión.
- Mitigación parcial ya aplicada en este cambio: guarda de `updatedAt` (los jugadores ignoran estados
  más antiguos que el ya adoptado).
- → Abordar en **Persistencia/ranking (§5.9)** o una feature de robustez de sesión.
- **§5.2 lo agrava:** al recargar, el jugador obtiene un `playerId` nuevo (`meId` no persistido) → su
  respuesta del quiz queda huérfana bajo el id viejo y aparece como "✗ no respondió". Mismo arreglo:
  persistir la identidad del jugador (localStorage) — junto con los puntos de §5.5.

## G — Evento `ready` del jugador inerte
- El Companion puede enviar `ready`, pero el host lo ignora (`void ev`). Hoy no tiene efecto.
- → Definir su uso (p. ej. "todos listos" habilita avanzar) en el **Motor de Quiz (§5.2)**.

## T — Temporizador (§5.3): `setTimeout` del host en pestaña en segundo plano
- El cierre automático del quiz depende de un `setTimeout` en el cliente host. Los navegadores
  estrangulan/aplazan timeouts en pestañas inactivas, así que si el host minimiza o cambia de pestaña,
  el cierre puede llegar tarde. En la práctica la Sala vive en primer plano (TV/pantalla), así que es
  de bajo impacto.
- → Endurecer con `visibilitychange` (al volver a visible, si `now ≥ deadline` y sigue en `quiz`,
  cerrar) o, mejor, mover la autoridad del reloj al servidor cuando se aborde la persistencia (§5.9).
- (La recarga del host a mitad de quiz pierde la ronda = mismo origen que **C** / §5.9.)

## X — Taxonomía (§5.7): tipos con <4 clasificaciones → pregunta con <4 opciones
- Para `espumoso` (2 clasificaciones) y `rosado` (3), la pregunta de "clasificación" sale con 2-3
  opciones (todas del mismo tipo; nunca cross-tipo, por diseño). HOY NO se dispara: los 4 vinos demo
  son tinto/blanco y la pregunta de clasificación solo cae en el vino tinto (rotación `wineIndex % 3`).
- → Decidir la política en **§5.6** cuando entren vinos espumoso/rosado reales: aceptar <4 opciones,
  ampliar las clasificaciones de esos tipos, o un fallback acotado. Añadir entonces un test del caso
  (hoy `taxonomy.test.ts` solo cubre el tinto).

## §5.8b — Banco de preguntas (admin): CRUD de `game_questions`

- Split de §5.8 (Admin del juego). §5.8a aborda solo los ajustes (`game_settings`) + readiness read-only.
- Pendiente: pantalla en `/admin` para CRUD de `game_questions` por vino/fase (enunciado ES/EN, opciones,
  `correct_answer`, `points`, `active`), avisando con `wines_question_readiness` de packs incompletos.
- Nota: `quiz-bootstrap` (Salvador) puede DERIVAR preguntas de la ficha+taxonomía (FR-12), así que el
  banco manual es para preguntas guardadas/override, no obligatorio para que el juego funcione.
- → Abordar tras §5.8a, coordinando el formato de `game_questions.options`/`correct_answer` con Salvador.

## §5.8c — Clasificación de vinos (admin): asignar `wines.category`/`classification_id`

- Split de §5.8 (Admin del juego). Editar tipo (`category`) y clasificación (`classification_id` →
  `wine_classifications`) de cada vino desde `/admin`.
- Nota: el importador CSV (#8) ya rellena ambos al importar; esto sería edición/corrección manual.
- → Abordar tras §5.8a/§5.8b.

## §5.6b-B — Persistencia de sesión (cliente): `session-finish`

- Split de §5.6b. §5.6b-A aborda el quiz en vivo desde la BD (bootstrap + quiz-close + fallback).
- Pendiente: en `final_podium`, llamar a `session-finish` (edge function de Salvador) con host_name,
  pack_tier, players (name/points/position) + foto del ganador (data-URL) → persiste `game_sessions`/
  `game_session_players` + sube la foto al bucket `winners`; alimenta `ranking_mensual` (§5.9).
- Coordinar con Salvador (formato de players/foto) y depende de su deploy. Carril nuestro = la llamada
  desde el cliente; la function es suya.
- → Abordar tras §5.6b-A.

## §5.6b-A — (anti-spoiler) `DEMO_WINES`/`getQuestion` siguen en el bundle del jugador

- Hallazgo de la revisión adversarial. El objetivo de §5.6b-A era sacar las respuestas del bundle de
  `/play`; se quitó el import directo del componente, pero la cadena estática
  `play → use-room-channel → quiz-source → wines` sigue enviando `DEMO_WINES`/`getQuestion` al cliente.
- **Riesgo real bajo:** son datos **demo** (las respuestas reales de la BD viven en la edge function y
  NUNCA llegan al cliente). Solo "filtra" en modo demo, donde de todas formas son de muestra.
- → Cerrar haciendo el motor demo **host-only** (p.ej. `import()` dinámico de `wines`/`quiz-source` en
  el efecto host de `use-room-channel`, fuera del grafo estático de `/play`). Diferido por decisión de David.

## §5.8a — (menor) Clobber de ediciones no guardadas entre bloques del editor de ajustes

- Hallazgo de la revisión adversarial. Al guardar el bloque **Global**, `load()` recalcula los defaults
  de los bloques de pack **aún no creados** → su `useEffect` re-siembra el form y descarta ediciones no
  guardadas en esos bloques. Caso estrecho (solo bloques de pack sin fila propia, al guardar Global).
- → Endurecer: dirty-guard por bloque, o `key` de remount, o no re-sembrar bloques con ediciones.

## §5.6b-B — (robustez) bordes de la persistencia de sesión a endurecer

- Hallazgos de la revisión adversarial (no bloqueantes; el camino feliz y los fixes ya están en dev):
- **Idempotencia:** `finishedRef` es por-instancia → un remount del host en `final_podium` re-invocaría
  `session-finish` (duplicado en el ranking). Mitigado: recargar el host vuelve a `lobby` (estado
  efímero, ítem **C**). → Endurecer con clave de idempotencia cliente o dedupe server (coordinar con Salvador).
- **Empate en cabeza:** la UI corona co-ganadores; el payload persiste UN solo ganador (orden estable,
  no determinista entre reconexiones por el orden de presence). → Decidir política para el ranking.
- **`host_name` siempre "Sala":** el host se monta sin `name` → todas las sesiones persisten "Sala".
  → Añadir identidad de host si `ranking_mensual` la necesita.
- **Tamaño de la foto del ganador** (data-URL) en el body de `session-finish`: sin límite explícito
  (presence ya acota ~128px). → Validar/comprimir si hace falta.

## Stripe §B — Fulfillment (webhook + pedido + access_code + QR + email)

- Split de "Stripe en modo demo". §A aborda solo el **checkout** (pago en test + fallback honesto). Esto
  es la persistencia del pedido.
- Pendiente: ruta de servidor `stripe-webhook` (necesita **raw body** para verificar la firma →
  `createServerFileRoute` con POST, no `createServerFn`), idempotente (event claiming); en
  `checkout.session.completed` → crea `orders` (existe en BD: `access_code`/`stripe_session_id`/`qr_url`),
  genera `access_code` + QR (enlaza con la activación de la sala del juego) y envía email de recibo
  (¿Resend?). Secret `whsec_…` en env de Vercel.
- → Abordar tras §A, con la cuenta Stripe ya creada (David).
- Endurecimientos pendientes (de la revisión de §A): **clave de idempotencia** en `sessions.create`
  (evita sesiones duplicadas al doble-submit); **verificar server-side `?checkout=success`** con
  `sessions.retrieve` antes de dar nada por pagado (imprescindible en modo LIVE); **allowlist del
  `origin`** de las `success_url`/`cancel_url` en vez de confiar en el del cliente.

## Stripe §B1 — (robustez) endurecimientos del webhook (de la revisión adversarial)

- §B1 (webhook + pedido + access_code) está hecho. `payment_status === "paid"` ya se comprueba. Pendiente:
- **Idempotencia robusta:** hoy es check-then-insert por `stripe_session_id` (cubre reintentos
  secuenciales de Stripe). El race de entregas concurrentes necesita **`UNIQUE(stripe_session_id)`** en
  `orders` (= migración → coordinar con Salvador) + tratar la violación única como 200 (no 500).
- **`access_code` único:** sin constraint en BD; añadir **`UNIQUE(access_code)`** (migración) + reintento
  ante colisión cuando se use para activar la sala (§B2/activación). Quitar también el sesgo de módulo
  (rejection sampling) y el fallback a `Math.random` (en Vercel siempre hay Web Crypto).
- **Pagos async:** manejar `checkout.session.async_payment_succeeded`/`...failed` (SEPA, etc.) además de
  la sesión inmediata.
- **Email vacío:** si `customer_details.email` falta, hoy se inserta `""`; decidir (rechazar/alertar).
- **500 en config faltante:** un secreto ausente provoca reintentos de Stripe ~3 días; alertar/monitorizar.

## Stripe §B2 — Recibo (email + QR) — HECHO; (robustez) endurecimientos de la revisión adversarial

- §B2 (recibo: email Resend + QR del `access_code` con enlace `/activar?code=…`) está **hecho**
  (best-effort, no rompe el webhook; fallback honesto sin `RESEND_API_KEY`). Pendiente de endurecer:
- **`origin` del enlace:** hoy se deriva de `session.success_url` (fiable en nuestro flujo `payment` con
  success_url explícito). Más robusto: un env `SITE_URL`/`PUBLIC_BASE_URL` de confianza.
- **Token al email tecleado:** el `access_code` viaja al email que el comprador escribió en Checkout; un
  typo lo enviaría a otra persona que podría activar la cata. Ligar la activación a identidad/re-auth en
  `/activar` (= esa otra feature).
- **Fallo transitorio de Resend:** se traga (log) + 200 → Stripe no reintenta → ese comprador no recibe el
  recibo. El pedido + access_code quedan guardados (recuperable manual). Endurecer con alerta/outbox
  (`receipt_failures`) para reenvío.
- **`RESEND_FROM` verificado:** sin remitente verificado en Resend, todo envío falla en silencio = go-live.
- **[PRUEBA PROD 21-jun-2026, PAUSADO]** el resto del bucle (pago→pedido→`/activar`→sala) funciona en prod,
  pero el email §B2 NO llega y en Resend NO aparece ningún intento → la llamada a Resend fue rechazada o no
  se hizo. Config verificada OK (`RESEND_TASTIA_API_KEY` en Production, deploy posterior). Sospecha: quota
  diaria compartida de Resend (~100/día) o la restricción del remitente `onboarding@resend.dev` (solo
  entrega al email de la cuenta). DIAGNÓSTICO pendiente: línea `[receipt]` en los **runtime logs de Vercel**
  (no build) o **Resend → Usage**. Reanudar una compra NUEVA (idempotencia: reenviar el evento viejo NO
  redispara el email).

## §Activar — (robustez) endurecimientos de la revisión adversarial

- §Activar (`/activar`: valida `access_code` → host en `/room/<code>`) está **hecho**. Pendiente de endurecer:
- **Oráculo de existencia:** `/activar` (público) confirma "code de pedido pagado" vs no. Hoy NO concede
  capacidad extra (cualquiera puede abrir `/room/<código>` como host — el motor de sala es abierto), solo
  filtra existencia/estado de pedidos; el espacio 31⁸ ≈ 8,5·10¹¹ hace la fuerza bruta inviable. Cerrar con
  **rate-limit por IP** del server-fn + **`room_code` fresco ≠ `access_code`** (la activación emite un
  código de sala desvinculado del credencial) → elimina el oráculo y el riesgo credencial=código público.
- **Caducidad:** sin columna `activation_expires_at` en `orders` (= migración → Salvador) para caducar accesos.
- **Identidad del comprador:** ligar la activación a identidad/re-auth (hoy basta el code).
- **Menor (LOW):** el cliente distingue `unconfigured` con `"configured" in res`; si la unión gana más
  variantes, preferir un tag discriminante. No es bug hoy.

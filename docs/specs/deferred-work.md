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

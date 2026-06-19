---
title: 'Cata gamificada — Estructura de Sesión y Rondas (máquina de estados)'
type: 'feature'
created: '2026-06-18'
status: 'done'
baseline_commit: 'b850668'
context: ['docs/prd-cata-gamificada/prd.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Hoy el modo de juego tiene una sola fase `tasting` por vino (texto libre) → `reveal`,
×4 vinos. El PRD §5.1 pide una progresión **por vino** de fases sensoriales (Vista/Olfato/Gusto) +
fase de gamificación, con **revelación por pregunta** y un **podio parcial tras cada vino**, hasta el
podio final.

**Approach:** Rediseñar `RoomState` y el avance host-autoritativo a un modelo
`stage × wineIndex × fase × step`, reutilizando la capa Realtime (broadcast "state" + presence). Solo
la **estructura/máquina de estados**; el quiz (§5.2), el temporizador (§5.3) y el reparto de puntos
(§5.5) se acoplan a este contrato.

## Product Decisions

- **Revelación por pregunta** — cada fase tiene subestados `quiz → reveal`; el avatar revela tras cada pregunta.
- **Podio parcial tras cada vino** + **podio final** — ranking acumulado al cerrar cada vino.
- **Alcance = solo máquina de estados + contrato de estado** — quiz/opciones (§5.2), temporizador (§5.3) y puntuación (§5.5) van aparte.
- **Reemplaza el flujo actual** (`lobby→tasting→reveal` texto libre); el scoring por texto libre queda superado (pre-lanzamiento).
- **Host-autoritativo** — el jugador nunca controla el avance.

## Boundaries & Constraints

**Always:** la Sala posee y difunde el estado (broadcast "state"); modelo `stage × wineIndex × fase ×
step`; orden de fases `vista → olfato → gusto → gamificacion`; reutilizar la capa Realtime + presence
existentes.

**Ask First:** persistir el estado de la sesión en BD (hoy es efímero — mantenerlo efímero salvo
indicación); cambiar el orden/conjunto de fases.

**Never:** implementar el contenido del quiz/opciones (§5.2), el temporizador real (§5.3) ni el
reparto de puntos detallado (§5.5); app nativa; tocar el flujo de compra.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Empezar | lobby, ≥1 jugador, host pulsa avanzar | stage=`playing`, vino 1/4, fase `vista`, step `quiz` | botón deshabilitado si 0 jugadores |
| Avanzar en quiz | `playing`/`quiz` | → `reveal` (misma fase) | — |
| Avanzar en reveal (fase < gamificación) | `playing`/`reveal` | → siguiente fase, step `quiz` | — |
| Avanzar en gamificación/reveal | `playing`, fase `gamificacion`/`reveal` | → `wine_podium` (ranking parcial del vino N) | — |
| Avanzar en wine_podium, N<4 | `wine_podium` | → vino N+1, `vista`, `quiz` | — |
| Avanzar en wine_podium, N=4 | `wine_podium` | → `final_podium` (ranking final) | — |
| Jugador se une tarde | cualquier stage | adopta el estado actual, 0 puntos | — |
| Jugador reconecta | desconexión + vuelta | recupera estado actual y conserva puntos | — |

</frozen-after-approval>

## Code Map

- `src/lib/session.ts` -- `SessionPhase`/`RoomState` actuales (a reemplazar). [verificado]
- `src/lib/use-room-channel.ts` -- máquina host-autoritativa: `updateState`/broadcast "state", `revealCurrentWine`, presence. [verificado]
- `src/routes/room/$code.tsx` -- Sala: botón guiado + render por fase; 1 fase/vino hoy. [verificado]
- `src/routes/play/$code.tsx` -- Companion: formulario de apuesta en `tasting`. [verificado]
- `src/lib/wines.ts` -- `DEMO_WINES` + `scoreGuess` (texto libre, queda fuera de §5.1). [verificado]

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/session.ts` -- reemplazar `SessionPhase` por el modelo de estado: `Stage` (`lobby`|`playing`|`wine_podium`|`final_podium`), `Fase` (`vista`|`olfato`|`gusto`|`gamificacion`), `Step` (`quiz`|`reveal`); `RoomState = { stage, wineIndex, fase, step, scores, updatedAt }`; `initialRoomState()` = lobby; constantes `FASES` (orden) y `WINE_COUNT=4`.
- [x] `src/lib/use-room-channel.ts` -- sustituir la lógica de fase por una acción host `advance()` que aplica las transiciones de la matriz; mantener broadcast "state" + presence + adopción por jugadores; dejar `scores` como contrato (el reparto real lo añade §5.5); retirar la dependencia de `revealCurrentWine`/`scoreGuess` texto libre.
- [x] `src/routes/room/$code.tsx` -- botón guiado único que llama `advance()` con label según `(stage,fase,step)`; render del estado actual (vino N/4 · fase · `quiz`/`reveal` con placeholder) y de los podios (parcial y final) desde `scores`.
- [x] `src/routes/play/$code.tsx` -- reflejar `(stage,fase,step)` con placeholders (esperando · quiz · revelación · podio parcial · podio final); retirar el formulario de texto libre (el quiz real = §5.2).
- [x] Test unitario de las transiciones de la I/O Matrix (función `advance()` pura).

**Acceptance Criteria:**
- Given lobby con ≥1 jugador, when el host avanza, then `stage=playing`, vino 1/4, fase `vista`, step `quiz`, y los companions lo reflejan en <1,5 s.
- Given `playing` en `quiz`, when el host avanza, then pasa a `reveal` de la misma fase.
- Given fase `gamificacion`/`reveal` del vino N, when el host avanza, then se muestra el **podio parcial** con el ranking acumulado tras el vino N.
- Given `wine_podium` del vino N (N<4), when el host avanza, then empieza el vino N+1 en `vista`/`quiz`.
- Given `wine_podium` del vino 4, when el host avanza, then `stage=final_podium` con el ranking final.
- Given un jugador que se desconecta y vuelve, when reconecta, then ve el estado actual y conserva sus puntos.

## Design Notes

Máquina de estados:
`lobby → (por vino N: [vista, olfato, gusto, gamificacion] cada una {quiz → reveal} → wine_podium) ×4 → final_podium`

`advance()` es la única transición (host-driven en §5.1; en §5.3 el paso `quiz → reveal` se disparará
también por temporizador). El quiz real (pregunta/opciones), el temporizador y el reparto de puntos
se acoplan en §5.2/§5.3/§5.5; aquí solo placeholders + el contrato `RoomState` que difunde la Sala.

## Verification

**Commands:**
- `bun run build` -- expected: compila sin errores de tipos.

**Manual checks:**
- `bun dev`; abrir `/room/TEST` (Sala) + `/play/TEST` (Companion) en contextos separados; unir un
  jugador y **recorrer toda la máquina** (4 vinos × 4 fases `quiz`/`reveal` + podio parcial → podio
  final) confirmando que el companion queda sincronizado en cada paso.

## Spec Change Log

- 2026-06-18 · Aprobada por David → `status: ready-for-dev`. Bloque `<frozen-after-approval>` bloqueado.
  Lista para `nch-dev`. (Añadido durante discovery: podio parcial tras cada vino.)
- 2026-06-18 · nch-dev: implementada en `feat/cata-estructura-sesion-rondas` (baseline b850668).
  Build + 10 tests OK. Revisión adversarial (3 revisores) → patches: **A** (broadcast fuera del updater
  de `setState`, StrictMode-safe), **B** (guarda de `updatedAt` al adoptar estado en el jugador),
  **D** (restaurado "Nueva cata"/`reset()` desde el podio final). Diferidos a `deferred-work.md`:
  **C** (estado efímero / recarga del host), **G** (evento `ready` inerte). Resto rechazado. → `done`.

## Suggested Review Order

**Máquina de estados (núcleo)**

- Punto de entrada: la única transición; toda la progresión por-vino vive aquí.
  [`session.ts:95`](../../src/lib/session.ts#L95)
- El modelo de estado (`Stage`/`Fase`/`Step`/`RoomState`) y el orden de fases.
  [`session.ts:67`](../../src/lib/session.ts#L67)

**Capa Realtime / host autoritativo**

- `advance()`: aplica la transición FUERA del updater de `setState` (StrictMode-safe) y difunde.
  [`use-room-channel.ts:62`](../../src/lib/use-room-channel.ts#L62)
- `reset()`: reinicia al lobby (restaura "Nueva cata" desde el podio final).
  [`use-room-channel.ts:71`](../../src/lib/use-room-channel.ts#L71)
- Guarda de monotonía `updatedAt` al adoptar estado en el jugador (anti-regresión por reordenación).
  [`use-room-channel.ts:107`](../../src/lib/use-room-channel.ts#L107)

**UI Sala (host)**

- Botón guiado único: avanza la máquina o reinicia en el podio final.
  [`room/$code.tsx:51`](../../src/routes/room/$code.tsx#L51)
- Label contextual según `(stage, fase, step)`.
  [`room/$code.tsx:17`](../../src/routes/room/$code.tsx#L17)

**UI Companion (jugador)**

- Placeholders por `(stage, fase, step)` (el quiz real = §5.2).
  [`play/$code.tsx:95`](../../src/routes/play/$code.tsx#L95)

**Periféricos**

- Test de las transiciones (I/O Matrix + recorrido end-to-end).
  [`session.test.ts`](../../src/lib/session.test.ts)

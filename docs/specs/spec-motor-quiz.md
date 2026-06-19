---
title: 'Cata gamificada — Motor de Quiz cronometrado (§5.2)'
type: 'feature'
created: '2026-06-19'
status: 'ready-for-dev'
context: ['docs/prd-cata-gamificada/prd.md', 'docs/specs/spec-estructura-sesion-rondas.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** §5.1 dejó el paso `quiz`/`reveal` como placeholder: el jugador no puede responder. §5.2
(FR-3/4/5 del PRD) añade la **Pregunta con Opciones**, el **envío de respuesta** del jugador, el
**registro en el host** y la señal de **"respondió"** (que consumirán el halo de §5.11 y el reparto
de puntos de §5.5).

**Approach:** Derivar la Pregunta de cada fase de la **nota de cata** del vino de forma determinista
(mismo orden de opciones en todos los clientes, sin engordar `RoomState`). El jugador envía su
elección por el canal Realtime (`broadcast "player"`); el host recoge las respuestas de la Pregunta
actual y expone quién respondió. Sala y Companion pintan la Pregunta real en `quiz` y el acierto en
`reveal`. **Sin temporizador real (§5.3) ni reparto de puntos (§5.5).**

## Product Decisions
- **Preguntas derivadas de la NOTA DE CATA** del vino: las sensoriales (Vista/Olfato/Gusto) de la
  nota (color/aroma/boca); la de gamificación (variedad/clasificación/precio) de la ficha. Fuente real
  = tabla `tasting_notes` (BD) vía §5.6; en §5.2 se usa un **banco demo** derivado de `DEMO_WINES`
  extendido con nota de cata estructurada.
- **Opción múltiple, 4 opciones** (1 correcta + 3 distractores), **orden determinista** (seed por
  `wineIndex+fase`) para que host y jugadores vean lo mismo sin difundir la Pregunta.
- **Una respuesta por jugador/Pregunta**, cambiable mientras `step==="quiz"`, **bloqueada en `reveal`**.
- **Sin temporizador real** (el host cierra con `advance` quiz→reveal; §5.3 añadirá la cuenta atrás);
  **sin puntos** (§5.5) ni narración del avatar (§5.4).
- El host expone el conjunto **"respondió"** — punto de integración para §5.11 (halo) y §5.5 (puntos).

## Boundaries & Constraints
**Always:** host-autoritativo (la Sala posee el estado y recoge respuestas); reutilizar el canal
Realtime + el modelo `stage/fase/step` de §5.1; Pregunta determinista (mismo orden en todos los
clientes); el jugador solo responde, no avanza.
**Ask First:** persistir respuestas en BD (hoy efímero — mantenerlo efímero); sustituir el banco demo
por el banco real gestionado por admin (§5.6).
**Never:** temporizador / cuenta atrás real (§5.3); reparto de puntos (§5.5); narración del avatar
(§5.4); banco de preguntas en BD/admin (§5.6); tocar el flujo de compra.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Pregunta activa | `step=quiz`, vino i, fase f | Sala y Companion muestran `getQuestion(i,f)`: enunciado + 4 opciones en el MISMO orden | — |
| Jugador responde | toca una opción en `quiz` | broadcast `answer{i,f,opt}`; el host lo registra; el jugador queda como "respondió" | índice de opción fuera de rango → se descarta |
| Jugador cambia | nuevo toque en `quiz` | cuenta la última opción (reemplaza la anterior) | — |
| Cierre (host avanza quiz→reveal) | `step→reveal` | se bloquean respuestas; se muestra la opción correcta + ✓/✗ por jugador | respuesta que llega tras el cierre → ignorada |
| Cambio de Pregunta | cambian `wineIndex` o `fase` | el host limpia las respuestas; los jugadores parten sin selección | — |
| Jugador no responde | `reveal` | aparece como ✗ (no respondió) | — |

</frozen-after-approval>

## Code Map
- `src/lib/session.ts` -- `Stage/Fase/Step/RoomState` + `PlayerEvent` (hoy solo `ready`). [verificado, feat]
- `src/lib/use-room-channel.ts` -- `advance`/broadcast "state"; handler "player" ignora eventos (`void ev`). [verificado, feat]
- `src/routes/room/$code.tsx` -- Sala: placeholder de quiz/reveal (`state.step`). [verificado, feat]
- `src/routes/play/$code.tsx` -- Companion: placeholder de quiz/reveal. [verificado, feat]
- `src/lib/wines.ts` -- `DEMO_WINES` (origen de las preguntas demo; a extender con nota de cata estructurada). [verificado, feat]

## Tasks & Acceptance

**Execution:**
- [ ] `src/lib/wines.ts` -- extender `DEMO_WINES` con nota de cata estructurada (`vista`/`olfato`/`gusto`); añadir `getQuestion(wineIndex, fase): Question` determinista: enunciado por fase, opción correcta de la nota (sensoriales) o de la ficha (gamificación: rota variedad/clasificación/precio por `wineIndex`), 3 distractores de un pool plausible del catálogo, orden barajado con seed `wineIndex+fase`.
- [ ] `src/lib/session.ts` -- añadir tipo `Question` (`{ fase, prompt, options: string[], correctIndex }`) y extender `PlayerEvent` con `answer` (`{ kind:"answer", playerId, name, wineIndex, fase, optionIndex }`); helper `isCorrect(answer, question)`.
- [ ] `src/lib/use-room-channel.ts` -- jugador: `submitAnswer(optionIndex)` (broadcast `answer` con `wineIndex`/`fase` actuales). Host: recoger `answers` (playerId→optionIndex) de la Pregunta actual, exponer `answeredIds` y limpiarlas al cambiar `(wineIndex,fase)`; el jugador conserva su `myAnswer` local hasta `reveal`.
- [ ] `src/routes/room/$code.tsx` -- en `quiz`: mostrar enunciado + 4 opciones + indicador de cuántos/quiénes han respondido; en `reveal`: resaltar la opción correcta y ✓/✗ por jugador.
- [ ] `src/routes/play/$code.tsx` -- en `quiz`: 4 opciones pulsables (resalta la elegida, permite cambiar); en `reveal`: opción correcta + tu ✓/✗.
- [ ] Test unitario: `getQuestion` determinista (mismo orden/correctIndex para `(i,f)`), rotación de gamificación, e `isCorrect`.

**Acceptance Criteria:**
- Given `step=quiz` en vino i/fase f, when la Sala y un Companion la muestran, then ven el mismo enunciado y las mismas 4 opciones en el mismo orden.
- Given un jugador en `quiz`, when toca una opción, then queda como "respondió" en el host; si toca otra, cuenta la última.
- Given el host avanza quiz→reveal, when se cierra, then se muestra la opción correcta y cada jugador ve ✓ (acertó) o ✗ (falló/no respondió); las respuestas posteriores se ignoran.
- Given se pasa a la siguiente Pregunta, when entra el nuevo `quiz`, then las respuestas se limpian y los jugadores parten sin selección.
- Given un jugador no responde, when llega `reveal`, then aparece como ✗.

## Design Notes
La Pregunta NO viaja en `RoomState`: ambos lados la derivan con `getQuestion(state.wineIndex, state.fase)`
(determinista, seed `wineIndex+fase` → mismo orden de opciones). El jugador envía solo el `optionIndex`
por `broadcast "player"`; el host mantiene las respuestas de la Pregunta actual (efímero) y publica
`answeredIds`. Ese conjunto es el contrato que §5.11 (halo verde/rojo) y §5.5 (puntos) consumirán; aquí
solo se usa para el indicador "respondió" y el ✓/✗ del `reveal`.

## Verification
**Commands:**
- `bun run build` -- expected: compila sin errores de tipos.
- `bun run test` -- expected: tests (incl. determinismo de `getQuestion`) en verde.

**Manual checks:**
- `bun dev`; `/room/TEST` + `/play/TEST`: el host arranca; en cada fase el Companion muestra 4 opciones,
  se elige una, la Sala marca "respondió"; el host avanza y aparece la correcta + ✓/✗. Comprobar que el
  orden de opciones coincide en Sala y Companion.

## Spec Change Log
- 2026-06-19 · Discovery (1 ronda) + APROBADA por David → `status: ready-for-dev`. Decisiones:
  preguntas derivadas de la nota de cata (banco demo desde `DEMO_WINES`), opción múltiple 4 con orden
  determinista, respuesta cambiable hasta `reveal`, sin timer (§5.3) ni puntos (§5.5), el host expone
  "respondió". Bloque `<frozen-after-approval>` bloqueado. **Depende de §5.1 (rama feat).**

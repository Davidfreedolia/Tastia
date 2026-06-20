---
title: 'Cata gamificada — Puntuación, Marcador y Podio (§5.5)'
type: 'feature'
created: '2026-06-20'
status: 'done'
baseline_commit: '58dcb9e'
context: ['docs/prd-cata-gamificada/prd.md', 'docs/specs/spec-motor-quiz.md', 'docs/specs/spec-estructura-sesion-rondas.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Hoy `scores` es un contrato vacío: nadie reparte puntos, así que el Marcador y los podios
(ya pintados por §5.1/§5.11) salen a 0. §5.5 (FR-10/11) reparte puntos automáticamente al cerrar cada
Pregunta y los acumula.

**Approach:** Al avanzar `quiz → reveal`, el host calcula los puntos de la Pregunta actual con una
función pura desde `answers` (§5.2) + `getQuestion`/`isCorrect`: **base a todos los que aciertan +
bonus por orden de llegada** (el temporizador real es §5.3). Acumula en `scores`, guarda el reparto de
la pregunta en `lastAward` y lo difunde; Sala y Companion muestran "+X" en el `reveal`.

## Product Decisions
- **Reparto = 100 base por acierto + bonus por orden** entre los correctos: `bonus = max(0, 50 − (puesto−1)×10)` (1º +50, 2º +40 … 6º +0).
- **Orden = llegada de la respuesta** (la última, ya que la última cuenta); sin temporizador real (§5.3 lo cambiará a tiempo).
- **Reparto en `quiz → reveal`** (host), **una sola vez** por Pregunta, **solo a quien acierta**.
- **`lastAward`** (reparto de la última Pregunta) en `RoomState` → para mostrar "+X" en el `reveal`; `scores` es el acumulado.

## Boundaries & Constraints
**Always:** el host es la autoridad del reparto, dentro de `advance` al cerrar `quiz→reveal`; reutilizar
`answers`/`isCorrect`/`getQuestion` (§5.2) y `scores` (§5.1); la lógica de puntos es una función PURA y
testeable; puntos solo a quien acierta.
**Ask First:** persistir puntos/resultados (§5.9); hacer los parámetros (100/50/−10) configurables por
admin (§5.8) — aquí van como constantes.
**Never:** temporizador real / bonus por tiempo absoluto (§5.3); persistencia del ganador (§5.9);
banco/admin (§5.6/§5.8); narración del avatar (§5.4).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Cierre con aciertos | host avanza `quiz→reveal`, `answers` con correctas | cada acertante suma `100 + bonus(orden)`; `scores` acumula; `lastAward` = reparto; se difunde | — |
| Nadie acierta | `answers` vacío o todas incorrectas | nadie suma; `scores` sin cambio; `lastAward = {}` | — |
| Cambio de respuesta | el jugador cambió antes del cierre | cuenta la última opción y su orden de llegada | — |
| Reparto único | `quiz→reveal` ocurre una vez por Pregunta | puntos repartidos exactamente una vez (las `answers` se limpian al cambiar de Pregunta) | re-entrar a `reveal` no re-reparte |
| Mostrar al revelar | `step=reveal` | Sala: "+X" por acertante; Companion: tus "+X"; fallo/sin responder → ✗ sin puntos | — |
| Podios | `wine_podium`/`final_podium` | el ranking refleja el `scores` acumulado real | sin jugadores → "Sin jugadores" |

</frozen-after-approval>

## Code Map
- `src/lib/use-room-channel.ts` -- host: `answers` (playerId→optionIndex, sin orden), `advance()` (quiz→reveal sin puntuar), `scores` en estado. [verificado, feat/cata-foto-panel]
- `src/lib/session.ts` -- `isCorrect`, `advanceState`, `RoomState` (+ `scores`). [verificado]
- `src/lib/wines.ts` -- `getQuestion(wineIndex,fase)` (para juzgar el acierto al cerrar). [verificado]
- `src/routes/room/$code.tsx` -- `reveal`: ✓/✗ por jugador; panel/podios leen `scores`. [verificado]
- `src/routes/play/$code.tsx` -- `reveal`: ✓/✗ propio. [verificado]

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/session.ts` -- añadir `lastAward?: Record<string, number>` a `RoomState`; añadir función PURA `computeAwards(answers: Record<string, { optionIndex: number; seq: number }>, question: Question): Record<string, number>` = para cada jugador, `isCorrect` ? `100 + max(0, 50 − (puesto−1)×10)` (puesto entre los correctos ordenados por `seq` ascendente) : sin entrada. Constantes `BASE=100`, `BONUS_MAX=50`, `BONUS_STEP=10`.
- [x] `src/lib/use-room-channel.ts` -- en la recogida de `answers` del host, registrar el `seq` de llegada (contador incremental por Pregunta, actualizado en cada respuesta del jugador). En `advance()`, cuando la transición sea `playing/quiz → playing/reveal`: llamar `computeAwards(answersActuales, getQuestion(prev.wineIndex, prev.fase))`, sumar a `scores`, fijar `lastAward` con el reparto, y difundir ese estado (en otras transiciones, dejar `scores`/`lastAward` intactos o limpiar `lastAward` al entrar en un nuevo `quiz`).
- [x] `src/routes/room/$code.tsx` -- en `reveal`, mostrar "+X" por acertante (desde `lastAward`); el panel/podios ya leen `scores` (sin cambios de lectura).
- [x] `src/routes/play/$code.tsx` -- en `reveal`, mostrar tus "+X" (`lastAward[meId]`) junto al ✓/✗.
- [x] Test unitario de `computeAwards`: todos aciertan (orden→bonus), nadie acierta, un solo acertante (100+50), 6º+ acertante (bonus 0), incorrecto sin entrada.

**Acceptance Criteria:**
- Given un `quiz` con respuestas correctas, when el host avanza a `reveal`, then cada acertante suma `100 + bonus` y el Marcador/podios reflejan el acumulado.
- Given un jugador acierta siendo el 3º correcto, when se cierra, then suma `130` (100 + 30).
- Given nadie acierta, when `reveal`, then nadie suma y `scores` no cambia.
- Given se revela la siguiente Pregunta, when se reparte, then se suma sobre el acumulado anterior.
- Given `reveal`, when se muestra, then cada acertante ve "+X" (Sala y su Companion) y quien falla/no responde ve ✗ sin puntos.

## Design Notes
El reparto vive en `advance()` justo en `quiz→reveal`, usando la función pura `computeAwards`
(testeable sin React/Realtime). El "orden" usa un `seq` que el host asigna al recibir cada respuesta
(la última cuenta); §5.3 sustituirá ese orden por el tiempo real. `lastAward` transporta el reparto de
la última Pregunta para el "+X" del `reveal`; `scores` es el acumulado que ya consumen panel y podios.
Parámetros como constantes (100/50/10); hacerlos configurables es §5.8.

## Verification
**Commands:**
- `bun run build` -- expected: compila sin errores de tipos.
- `bunx vitest run --root C:\Projects\Tastia` -- expected: tests (incl. `computeAwards`) en verde.

**Manual checks:**
- `/room/TEST` + `/play/TEST` (2+ móviles): responder un quiz (algunos aciertan, otros no); el host avanza
  a `reveal` → cada acertante ve "+X" y el panel/podio suben; comprobar que el 1º correcto recibe más
  bonus que el 2º, y que recorrer los 4 vinos acumula hasta el podio final.

## Spec Change Log
- 2026-06-20 · Discovery (1 ronda) + APROBADA por David → `status: ready-for-dev`. Decisiones: 100 base +
  bonus `max(0,50−(puesto−1)×10)` por orden de llegada (la última cuenta); reparto único en quiz→reveal
  solo a correctos; `lastAward` para el "+X"; parámetros como constantes (config = §5.8). Depende de §5.2
  (answers/isCorrect). Bloque `<frozen-after-approval>` bloqueado.
- 2026-06-20 · nch-dev: implementada en `feat/cata-puntuacion` (baseline `58dcb9e`). Build + 32 tests OK.
  Revisión adversarial (3 revisores) → 1 patch: filtrar las respuestas a jugadores PRESENTES antes de
  repartir (evita puestos de bonus y puntos fantasma de quien se fue). #1 (`seq` reasignado al cambiar
  de respuesta) = conforme al spec ("la última cuenta"); resto rechazado. → `done`.

## Suggested Review Order

**Lógica de puntos (núcleo, pura)**

- Punto de entrada: 100 base + bonus por orden entre correctos (función pura, testeada).
  [`session.ts:200`](../../src/lib/session.ts#L200)
- Constantes (100/50/10) + `lastAward` en el estado.
  [`session.ts:185`](../../src/lib/session.ts#L185)

**Reparto host-autoritativo**

- `advance()`: reparte en `quiz→reveal`, acumula en `scores`, fija `lastAward`.
  [`use-room-channel.ts:95`](../../src/lib/use-room-channel.ts#L95)
- Filtro a participantes presentes antes de repartir (revisión #3).
  [`use-room-channel.ts:116`](../../src/lib/use-room-channel.ts#L116)
- Captura del `seq` (orden de llegada; la última cuenta).
  [`use-room-channel.ts:204`](../../src/lib/use-room-channel.ts#L204)

**UI "+X"**

- Sala: "+X" por acertante en el `reveal`.
  [`room/$code.tsx:196`](../../src/routes/room/$code.tsx#L196)
- Companion: tus "+X".
  [`play/$code.tsx:251`](../../src/routes/play/$code.tsx#L251)

**Periféricos**

- Tests de `computeAwards`.
  [`session.test.ts`](../../src/lib/session.test.ts)

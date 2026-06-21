---
title: '§5.6b-A — Quiz en vivo desde la BD (bootstrap + quiz-close) con fallback demo'
type: 'feature'
created: '2026-06-21'
status: 'done'
baseline_commit: '2a2504f'
context: ['{project-root}/docs/edge-functions-contract.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El bucle de juego está hardcoded en el cliente (`FASE_SECONDS`, `BASE/BONUS`,
`getQuestion`/`DEMO_WINES`) y el jugador tiene las respuestas en su propio bundle (`/play` importa
`getQuestion`) → ni es real ni anti-spoiler. David quiere "nada hardcoded, funcionamiento natural".

**Approach:** El **host** carga `quiz-bootstrap` al montar la Sala (settings + vinos + preguntas, SIN
respuestas), usa los `settings` para tiempos/puntos, y **difunde la pregunta activa y el reveal** (de
`quiz-close`) dentro de `RoomState`; el **jugador solo renderiza** lo difundido (deja de derivar con
`getQuestion`). Si la edge function no responde, **fallback completo** a las constantes/`DEMO_WINES`
actuales con un badge "Datos demo". Anti-spoiler (opción B): el bootstrap no trae respuestas; el reveal
llega por `quiz-close`.

## Product Decisions

- **Todo §5.6b-A junto** (settings + vinos/preguntas + `quiz-close`) -- decisión de David.
- **Host-autoritario:** el host llama a bootstrap/quiz-close y difunde `activeQuestion` + `reveal` +
  `source`; el jugador pasa a renderizador puro (se quita `getQuestion` de `/play` y del render de
  `/room`) -- coherencia y cierra el leak de respuestas en el bundle del jugador.
- **BD = fuente de verdad + fallback mínimo** a constantes/`DEMO_WINES` si la function falla -- demoable
  sin deploy, nunca se rompe.
- **Badge "Datos demo"** cuando `source === 'demo'` -- honestidad (el equipo ve que no son datos reales).
- **Anti-spoiler B:** `quiz-bootstrap` sin respuestas; reveal por `quiz-close` (`correctOptionIndex`,
  `correctLabel`, `revealedWine`).

## Boundaries & Constraints

**Always:** en modo BD el jugador NUNCA recibe la respuesta antes del reveal; el **host** es la única
autoridad (settings, scoring, reveal, deadline); el fallback demo debe dejar el juego **plenamente
funcional** sin la edge function; reutilizar `getQuestion`/`computeAwards`/`FASE_SECONDS`/`BASE/BONUS`
como motor del modo demo (no duplicarlos); **proteger `advance()` de reentrada** durante el `await` de
`quiz-close` (un solo cierre por pregunta, aunque coincidan timer y botón).

**Ask First:** qué espera `quiz-bootstrap` como `code` (coordinar con Salvador; default asumido: acepta
el código de sala y devuelve un pack demo/por defecto hasta que exista el flujo de activación/pedido);
cualquier cambio al contrato de las edge functions.

**Never:** tocar las edge functions (Deno, de Salvador), el ranking de la landing ni el avatar;
persistir la sesión (`session-finish` = §5.6b-B, diferido); exponer `correct_answer` al cliente en modo BD.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Montar Sala (BD OK) | host; `quiz-bootstrap` responde | `source='bd'`; settings y preguntas de la BD; sin respuestas en el cliente | — |
| Montar Sala (BD falla) | invoke error/timeout / Supabase no configurado | `source='demo'`; usa `FASE_SECONDS`/`BASE` + `getQuestion`/`DEMO_WINES`; badge "Datos demo" | captura error; no rompe |
| Entrar en quiz | `advance` → `playing/quiz` | host fija `activeQuestion {prompt,options}` + `deadline` (settings o `FASE_SECONDS`) y difunde | sin pregunta para `(i,fase)` → cae a demo de esa pregunta |
| Cerrar quiz→reveal (BD) | `answers` + `quiz-close` | `reveal {correctOptionIndex, correctLabel, revealedWine?}` + `awards`; acumula `scores`; difunde | si `quiz-close` falla → esa ronda SIN puntos (`awards` vacíos, sin marcar correcta); NUNCA se puntúa una pregunta BD con demo |
| Cerrar quiz→reveal (demo) | `answers` | `computeAwards` local + `correctIndex` de `getQuestion` | — |
| Jugador renderiza | recibe `state.activeQuestion`/`reveal` | pinta la pregunta y, en reveal, la opción correcta; **nunca antes** | `activeQuestion` ausente → estado de carga |
| Cierre concurrente | timer y botón a la vez durante el `await` | un solo cierre (guard de reentrada) | ignora el segundo |

</frozen-after-approval>

## Code Map

- `src/lib/use-room-channel.ts` -- hook host/player; `advance()` (se vuelve async), efecto de montaje (bootstrap), broadcast de estado; hoy puntúa con `computeAwards(map, getQuestion(...))` (línea 131).
- `src/lib/session.ts` -- `RoomState` (añadir `activeQuestion?`, `reveal?`, `source?`); tipo `Question`.
- `src/lib/quiz-source.ts` -- **NUEVO**: capa que abstrae BD-vs-demo (bootstrap/close + fallback).
- `src/lib/wines.ts` -- `getQuestion`/`DEMO_WINES`: motor del **modo demo** (reutilizar, no romper).
- `src/routes/room/$code.tsx` -- render del quiz; hoy `getQuestion(state.wineIndex, state.fase)` (línea 150) → pasar a `state.activeQuestion`/`state.reveal`.
- `src/routes/play/$code.tsx` -- íd. (línea 248); quitar el import de `getQuestion`.
- `src/lib/supabase.ts` -- `getSupabase()`; las funciones se llaman con `supabase.functions.invoke`.
- `docs/edge-functions-contract.md` -- contrato (bootstrap sin respuestas; `quiz-close` → `correctOptionIndex/correctLabel/awards/revealedWine`).

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/quiz-source.ts` (NUEVO) -- `loadQuizSource(code): Promise<QuizSource>`: intenta `quiz-bootstrap` (`functions.invoke`); OK → `source:'bd'` con `settings`, `questionFor(i,fase)→{prompt,options}` (de `questions[]`) y `closeQuiz(i,fase,answers,presentIds)→{correctOptionIndex,correctLabel,awards,revealedWine?}` (invoca `quiz-close`); error/timeout/Supabase no configurado → `source:'demo'` que envuelve `getQuestion`/`computeAwards`/`FASE_SECONDS`/`BASE`. Exportar tipos.
- [x] `src/lib/quiz-source.test.ts` -- modo demo: `questionFor`/`closeQuiz` coinciden con `getQuestion`/`computeAwards`; `loadQuizSource` cae a `'demo'` si Supabase no está configurado o el invoke lanza.
- [x] `src/lib/session.ts` -- `RoomState` += `activeQuestion?: { prompt: string; options: string[] }`, `reveal?: { correctOptionIndex: number; correctLabel: string; revealedWine?: unknown }`, `source?: 'bd' | 'demo'`; documentar que los fija el host y viajan en el broadcast.
- [x] `src/lib/use-room-channel.ts` -- host: al montar `loadQuizSource(code)` → ref (`settings`/`source`/`closeQuiz`/`questionFor`); `advance()` async: al entrar en `quiz` fija `activeQuestion` + `deadline` (settings o `FASE_SECONDS`) + `source`; al cerrar `quiz→reveal` `await closeQuiz(...)` → `scores`/`lastAward`/`reveal`; **guard de reentrada** (flag "cerrando"); el efecto del timer invoca la versión async. Player: no deriva; consume `state`.
- [x] `src/routes/room/$code.tsx` -- render desde `state.activeQuestion`/`state.reveal`; quitar `getQuestion`; badge "Datos demo" si `state.source==='demo'`.
- [x] `src/routes/play/$code.tsx` -- íd.; quitar el import de `getQuestion`; mismo badge.

**Acceptance Criteria:**
- Given la function desplegada, when se monta la Sala, then juega con settings/vinos/preguntas de la BD (`source='bd'`) y el bundle del jugador no contiene la respuesta antes del reveal.
- Given un tiempo cambiado en el admin (§5.8a), when se juega en modo BD, then la cuenta atrás usa ese tiempo.
- Given la function no disponible, when se monta, then cae a modo demo (constantes/`getQuestion`), la Sala muestra "Datos demo" y el juego funciona igual.
- Given quiz en modo BD, when se cierra una pregunta, then `quiz-close` puntúa y revela (`correctOptionIndex`/`correctLabel`) y en la última fase del vino llega `revealedWine`.
- Given cierre por timer y por botón a la vez, when coinciden durante el `await`, then solo se cierra una vez.
- Given los tests existentes (session/wines/taxonomy), when corren, then siguen verdes (modo demo intacto).

## Spec Change Log

- 2026-06-21 — Aprobada (ready-for-dev). Alcance "todo junto" (settings + vinos/preguntas + quiz-close)
  por decisión de David, pese a ~1800 tokens (sobre la guía de 1600). Host-autoritario, fallback demo
  con badge "Datos demo", capa `quiz-source.ts`. §5.6b-B (session-finish) diferido a `deferred-work.md`.

- 2026-06-21 — Revisión adversarial (iter. 1). Hallazgos corregidos: (1) CRÍTICO — la fuente del quiz
  se leía del ref mutable al servir Y al cerrar → podía mezclar BD↔demo (loadQuizSource resolviendo a
  media Pregunta, pregunta BD ausente, o quiz-close fallando con fallback demo) y puntuar una pregunta
  con otra. Fix: fallback TODO-o-NADA por carga + fuente capturada por-Pregunta (`activeSrcRef`); sin
  demo-scoring de una pregunta BD (con aprobación de David se enmienda el clause frozen del I/O Matrix).
  (2) `deadline=NaN` si los settings BD traen un tiempo no numérico → `loadQuizSource` valida settings
  (si no, demo). (3) guard de carrera tras el `await` (reset/avance). (4) `Number()` en los awards de
  red. DIFERIDO (decisión de David): el bundle del jugador aún incluye `DEMO_WINES`/`getQuestion` (vía
  use-room-channel→quiz-source→wines) — riesgo real bajo (datos demo; las respuestas BD nunca llegan al
  cliente) → `deferred-work.md`.

## Design Notes

- **Host-autoritario unifica BD y demo:** el host SIEMPRE fija `activeQuestion`/`reveal`/`source` en
  `RoomState`; solo cambia la **fuente** (`quiz-source`). El jugador pasa a renderizador puro → elimina
  el leak actual de respuestas en el bundle de `/play`.
- **`advance()` async + guard:** marcar "cerrando" durante el `await` de `quiz-close`; el timer y el
  botón comprueban el guard para no cerrar dos veces (hoy `advance` es síncrona y se dispara desde
  `setTimeout` y desde el botón).
- **Fallback TODO-o-NADA por carga (no por-pregunta):** `loadQuizSource` devuelve BD solo si el payload
  es válido (settings con 4 tiempos numéricos + ≥1 pregunta); si no, demo COMPLETA. La fuente se
  **captura al entrar en la Pregunta** (`activeSrcRef`) y se usa al cerrarla → servir y puntuar usan
  SIEMPRE la misma fuente (aunque `loadQuizSource` resuelva a media Pregunta). **Nunca** se puntúa una
  pregunta BD con el motor demo (órdenes de opciones distintos → respuesta/puntos erróneos).
- **`quiz-close` falla a media partida:** esa ronda queda SIN puntos y sin marcar correcta
  (`correctOptionIndex = -1`); no se inventa con demo. Guard de carrera: si el estado cambió durante el
  `await` (reset/avance), el cierre se aborta sin difundir.
- **`code`→pack:** a coordinar con Salvador (ver *Ask First*); no bloquea el modo demo.

## Verification

**Commands:**
- `bunx tsc --noEmit` -- expected: sin errores.
- `bunx vitest run` -- expected: pasan `quiz-source` + los existentes (≥43).
- `bun run build` -- expected: build OK.

**Manual checks:**
- Sin deploy: preview → `/room/TEST` juega en modo demo con badge "Datos demo".
- Con deploy (cuando Salvador despliegue): `/room/TEST` juega con datos de la BD (sin badge); editar un
  tiempo en `/admin` §5.8a cambia la cuenta atrás; el reveal muestra la opción correcta tras cerrar.

## Suggested Review Order

**Fuente del quiz (BD vs demo) — el núcleo**

- Carga TODO-o-NADA: BD solo si el payload es válido (settings numéricos + ≥1 pregunta), si no demo; valida settings (anti-NaN).
  [`quiz-source.ts:143`](../../src/lib/quiz-source.ts#L143)
- Motor demo reutilizado (getQuestion/computeAwards/constantes), síncrono.
  [`quiz-source.ts:91`](../../src/lib/quiz-source.ts#L91)

**Cierre host-autoritario (lo más delicado: async + fuente capturada + guards)**

- `advance()` async: al entrar fija pregunta/deadline/source; al cerrar puntúa/revela.
  [`use-room-channel.ts:118`](../../src/lib/use-room-channel.ts#L118)
- Captura la fuente por-Pregunta (servir y cerrar usan la MISMA).
  [`use-room-channel.ts:135`](../../src/lib/use-room-channel.ts#L135)
- Cierre con la fuente capturada: sin demo-scoring de una pregunta BD + guard de carrera tras el `await`.
  [`use-room-channel.ts:163`](../../src/lib/use-room-channel.ts#L163)
- Carga de la fuente al montar (host); difunde `source` para el badge.
  [`use-room-channel.ts:224`](../../src/lib/use-room-channel.ts#L224)

**Estado difundido + render**

- `RoomState` += `activeQuestion`/`reveal`/`source` (los fija el host).
  [`session.ts:131`](../../src/lib/session.ts#L131)
- Sala: render de `state.activeQuestion`/`state.reveal` + badge "Datos demo".
  [`room/$code.tsx:164`](../../src/routes/room/$code.tsx#L164)
- Companion: íd. (renderizador puro, ya no deriva con `getQuestion`).
  [`play/$code.tsx:263`](../../src/routes/play/$code.tsx#L263)

**Periféricos**

- Tests de la quiz-source (paridad demo + fallback + validación + cierre BD).
  [`quiz-source.test.ts:1`](../../src/lib/quiz-source.test.ts#L1)

---
title: '§5.6b-A (cierre) — Anti-spoiler: motor demo host-only (fuera del bundle de /play)'
type: 'feature'
created: '2026-06-21'
status: 'done'
baseline_commit: '7f839cc'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La cadena de imports estática `play/$code → use-room-channel → quiz-source → wines` mete
`DEMO_WINES`/`getQuestion` (que llevan la **respuesta correcta** y la ficha del vino) en el bundle del
**jugador** (`/play`). Un jugador podría inspeccionar el bundle y "spoilear" la cata en modo demo. (Las
respuestas reales de la BD viven en la edge function y nunca llegan al cliente; esto solo afecta a demo.)

**Approach:** Hacer el motor del quiz (`quiz-source`, que importa `wines`) **host-only** vía `import()`
dinámico: el host lo carga en su efecto; los imports estáticos pasan a **type-only**. Así `wines` cae en
un **chunk aparte** que solo descarga el host; el bundle de `/play` deja de contener las respuestas demo.

## Product Decisions

- **`quiz-source` se importa dinámicamente** solo en los caminos del HOST de `use-room-channel`; el import estático pasa a `import type { CloseResult, QuizSource }` (los tipos se borran en compilación, no bundlean).
- **`quizSourceRef`/`activeSrcRef`** pasan a `useRef<QuizSource | null>(null)` (ya no se inicializan con `demoQuizSource()` síncrono, que forzaba el import estático).
- **`secondsFor`** se **inlinea** localmente en `use-room-channel` (función pura wines-free; mapea fase→`time_<fase>_s`), para no importarla de `quiz-source` (que arrastra `wines`). La `secondsFor` de `quiz-source` se mantiene (sus tests siguen).
- **Sin cambio de comportamiento del juego:** el host sigue sirviendo/cerrando igual; el jugador ya renderiza solo lo difundido (no usa `quiz-source`). El fallback total a demo y el contrato BD se conservan.
- **Carrera de carga:** el efecto host carga el motor al montar; `advance()` (ya async) hace un `import()` perezoso de respaldo si entra en quiz antes de que resuelva (caso casi imposible: el chunk es local).

## Boundaries & Constraints

**Always:** preservar el comportamiento actual del host (servir `activeQuestion`/`deadline`, cerrar con
reparto/reveal) y del jugador (renderizar lo difundido); mantener el fallback a demo y el contrato con la
BD (`quiz-bootstrap`/`quiz-close`); `quizSourceRef`/`activeSrcRef` siguen siendo host-only.

**Never:** cambiar la lógica de puntuación/reveal ni el orden de opciones; hacer que el jugador importe
`quiz-source`/`wines`; tocar edge functions, avatar, migraciones, BD; romper la captura de fuente
(`activeSrcRef`) que evita mezclar BD↔demo en una misma Pregunta.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Bundle de `/play` | build de producción | NO contiene `DEMO_WINES`/`getQuestion` (las respuestas demo) | — |
| Host sirve una Pregunta | host avanza a `playing/quiz` | igual que hoy: `activeQuestion` (sin respuesta) + `deadline` | si la fuente aún no cargó → `import()` perezoso de demo, luego sirve |
| Host cierra (quiz→reveal) | timer/botón | igual que hoy: puntúa+revela con la fuente CAPTURADA (`activeSrcRef`) | `activeSrcRef` null (imposible tras entrar) → no clobbear |
| Modo BD | `quiz-bootstrap` OK | host carga BD vía el `import()` dinámico; idéntico a hoy | fallo → fallback demo (mismo `import()`) |
| Jugador | `/play` en partida | renderiza lo difundido; nunca importa el motor | — |

</frozen-after-approval>

## Code Map

- `src/lib/use-room-channel.ts` -- **PRINCIPAL**: (1) import de `quiz-source` → `import type { CloseResult, QuizSource }`; (2) `secondsFor` local wines-free; (3) `quizSourceRef`/`activeSrcRef` → `QuizSource | null`; (4) efecto host de carga → `import("./quiz-source")` (demo fallback + `loadQuizSource`); (5) `advance()` entrar-en-quiz → guard `import()` perezoso si la fuente es null; guard null en el cierre (`activeSrcRef`).
- `src/lib/quiz-source.ts` -- SIN cambios (sigue importando `wines`; ahora se carga dinámico). `secondsFor` se mantiene para sus tests.
- `src/routes/play/$code.tsx` -- NO se toca; deja de recibir `wines` por el corte del grafo estático.
- `src/lib/wines.ts` -- las respuestas demo; objetivo: fuera del bundle de `/play`.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/use-room-channel.ts` -- aplicar los 5 cambios del Code Map. `secondsFor` local: `function secondsFor(s: QuizSource["settings"], fase: Fase): number` con switch (`vista→time_vista_s`, etc.). Efecto host: `let alive=true; import("./quiz-source").then(({demoQuizSource, loadQuizSource}) => { if(!alive) return; quizSourceRef.current ??= demoQuizSource(); return loadQuizSource(code); }).then((src) => { if(!alive||!src) return; quizSourceRef.current = src; updateState({source: src.source}); });`. `advance()` entrar-quiz: `let src = quizSourceRef.current; if(!src){ const {demoQuizSource} = await import("./quiz-source"); src = quizSourceRef.current ?? demoQuizSource(); quizSourceRef.current = src; } activeSrcRef.current = src; …`. Cierre: `const src = activeSrcRef.current; if(!src) return;` antes de `src.closeQuiz`.

**Acceptance Criteria:**
- Given el build de producción, when se inspecciona el chunk que carga `/play`, then NO contiene `DEMO_WINES`/`getQuestion` (las respuestas demo quedan en un chunk async que solo carga el host).
- Given el host en una partida demo, when sirve y cierra cada Pregunta, then funciona igual que hoy (misma pregunta, mismo reparto, mismo reveal) — sin regresión.
- Given el modo BD, when `quiz-bootstrap` responde, then el host usa la fuente BD igual que hoy (el `import()` dinámico no cambia el contrato).
- Given `tsc`/`vitest`/`build`, when se ejecutan, then verdes.

## Spec Change Log

- 2026-06-21 — Creada y aprobada por David (pidió cerrar el anti-spoiler que él mismo había diferido).
  Motor demo host-only vía `import()` dinámico; `secondsFor` inline wines-free; sin cambio de comportamiento.

- 2026-06-21 — Implementado + verificación de bundle (prueba de oro): `DEMO_WINES` quedó SOLO en el chunk
  async `quiz-source-*.js`, que únicamente carga el host vía `await import("./quiz-source")` (2 caminos del
  host). El chunk de `/play` (`_code-*.js`) NO lo contiene, NO tiene ningún `import(` y NO referencia
  `quiz-source`/`wines`. Comportamiento del motor intacto (147 tests sin cambios, tsc 0, build OK). Cambio
  extra mínimo: `quizSourceRef.current?.source ?? "demo"` en el efecto de persistencia (nullable, equivalente).

## Suggested Review Order

**Motor (host-only)**

- Import type-only + `secondsFor` local wines-free.
  [`use-room-channel.ts:12`](../../src/lib/use-room-channel.ts#L12)
- `advance()` entrar-en-quiz: guard de carga perezosa + captura `activeSrcRef`.
  [`use-room-channel.ts:156`](../../src/lib/use-room-channel.ts#L156)
- Efecto host de carga: `import("./quiz-source")` (demo fallback + `loadQuizSource`).
  [`use-room-channel.ts:244`](../../src/lib/use-room-channel.ts#L244)

**Verificación**

- El chunk de `/play` no trae `DEMO_WINES` (grep del build). Ver Change Log.

## Design Notes

- **Por qué `import type`:** los tipos (`QuizSource`/`CloseResult`) se borran en compilación → no arrastran
  `wines`. Solo los imports de VALOR (`demoQuizSource`/`loadQuizSource`/`secondsFor`) bundlean el módulo.
- **Por qué inline `secondsFor`:** vive en `quiz-source.ts` (que importa `wines`); importarla estáticamente
  arrastraría `wines`. Es una función pura trivial → copia local wines-free; la canónica sigue testeada.
- **Riesgo real bajo, valor: defensa en profundidad.** Las respuestas reales (BD) nunca llegan al cliente;
  esto cierra la fuga en modo demo. La verificación clave es el grep del bundle de `/play`.

## Verification

**Commands:**
- `bunx tsc --noEmit` -- sin errores.
- `bunx vitest run` -- verdes (incl. `quiz-source` / `session`).
- `bun run build` -- OK. Luego: buscar en el output de build un marcador de `DEMO_WINES` (p.ej. el nombre/uva de un vino demo) y confirmar que NO está en el chunk de `/play` (sí puede estar en un chunk async aparte).

**Manual checks:**
- Jugar una cata demo (host + 1 jugador en `/room//play`): servir, contestar, cerrar y ver el reveal — sin regresión.

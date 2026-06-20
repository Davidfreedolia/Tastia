---
title: 'Cata gamificada — Temporizador autoritativo y cierre automático (§5.3)'
type: 'feature'
created: '2026-06-20'
status: 'done'
baseline_commit: '2c73785'
context: ['docs/prd-cata-gamificada/prd.md', 'docs/specs/spec-estructura-sesion-rondas.md', 'docs/specs/spec-motor-quiz.md', 'docs/specs/spec-puntuacion.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Hoy el quiz solo se cierra si el host pulsa "avanzar" — no hay cuenta atrás ni cierre
automático, así que no es un "quiz cronometrado". §5.3 (FR-6/7) añade el temporizador.

**Approach:** Al entrar en un `quiz`, la Sala (host) fija un `deadline` (timestamp) según la fase y lo
difunde en `RoomState`; Sala y Companions calculan el restante localmente (sin enviar cada segundo). Un
temporizador del host dispara automáticamente el cierre `quiz→reveal` (la misma transición que ya
reparte puntos en §5.5) al llegar a 0; el host puede seguir cerrando a mano antes.

## Product Decisions
- **`deadline` (timestamp ms) en `RoomState`**, fijado al entrar en un `quiz`; se difunde y cada cliente
  calcula el restante con su reloj (la cuenta atrás visible es **cosmética**).
- **Cierre automático host-autoritativo:** un temporizador del host dispara `quiz→reveal` al llegar a 0
  (reusa `advance()`; reparte §5.5). El **botón manual sigue** (cerrar antes).
- **Bonus se mantiene por ORDEN** (§5.5); §5.3 no lo cambia a tiempo real.
- **Duraciones (constantes):** Vista 30" · Olfato 30" · Gusto 45" · gamificación 30". (Configurables por
  admin = §5.8.)

## Boundaries & Constraints
**Always:** la Sala es la autoridad (fija el `deadline` y dispara el cierre); el cierre reusa el
`advance()` quiz→reveal (§5.5); las respuestas tardías ya se ignoran (§5.2); sólo hay cuenta atrás en `quiz`.
**Ask First:** cambiar el bonus a tiempo real (afecta §5.5); enviar el reloj por la red cada segundo.
**Never:** tiempos configurables por admin (§5.8 — aquí constantes); persistencia (§5.9); narración del
avatar (§5.4); rehacer el reparto de puntos (§5.5).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Entrar en quiz | `advance` → `playing/quiz` | `deadline = now + FASE_SECONDS[fase]×1000`; se difunde; Sala+Companion muestran cuenta atrás | — |
| Llegar a 0 | `now ≥ deadline`, `step=quiz` | el host dispara `quiz→reveal` automáticamente (reparte §5.5) | si ya se cerró a mano, no re-dispara (ya no está en `quiz`) |
| Cierre manual antes | host pulsa avanzar | cierra ya; el temporizador pendiente se cancela | — |
| Fuera de quiz | `reveal`/podios/`lobby` | sin `deadline`, sin cuenta atrás | — |
| Reconexión a mitad | jugador entra en `quiz` | recibe `deadline`; su cuenta atrás muestra el restante | desfase de reloj menor (cosmético; el cierre lo manda el host) |
| Sólo el host corre el timer | jugadores en `quiz` | los Companions NO disparan cierre (no son autoridad) | — |

</frozen-after-approval>

## Code Map
- `src/lib/session.ts` -- `RoomState` (sin `deadline`), `Fase`, `advanceState`. [verificado, feat/cata-puntuacion]
- `src/lib/use-room-channel.ts` -- `advance()` host (quiz→reveal + reparto §5.5); presence/broadcast; sin temporizador. [verificado]
- `src/routes/room/$code.tsx` -- Sala: botón guiado; sin cuenta atrás. [verificado]
- `src/routes/play/$code.tsx` -- Companion: quiz sin cuenta atrás. [verificado]

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/session.ts` -- añadir `deadline?: number` a `RoomState`; añadir `FASE_SECONDS: Record<Fase, number>` = `{ vista:30, olfato:30, gusto:45, gamificacion:30 }`; helper PURO `quizDeadline(fase, now): number` (= `now + FASE_SECONDS[fase]*1000`).
- [x] `src/lib/use-room-channel.ts` -- en `advance()`: si `next.stage==="playing" && next.step==="quiz"`, fijar `next.deadline = quizDeadline(next.fase, Date.now())`; en cualquier otro estado, `next.deadline = undefined`. Añadir un efecto SOLO-host: cuando `state` sea `playing/quiz` con `deadline`, programar un `setTimeout(deadline − Date.now())` que, si sigue en ese mismo `quiz`, llame a `advance()` (cierre automático); limpiar el timeout al cambiar de estado/desmontar.
- [x] `src/components/Countdown.tsx` -- componente `<Countdown deadline={number} />` que refresca cada segundo y muestra los segundos restantes (mín. 0); se detiene al llegar a 0.
- [x] `src/routes/room/$code.tsx` -- mostrar `<Countdown>` durante `quiz` (junto a la pregunta/cabecera).
- [x] `src/routes/play/$code.tsx` -- mostrar `<Countdown>` durante `quiz`.
- [x] Test unitario de `quizDeadline`/`FASE_SECONDS` (valores por fase; gusto=45, resto=30).

**Acceptance Criteria:**
- Given se entra en un `quiz`, when arranca, then Sala y Companion muestran una cuenta atrás acorde a la fase (30/30/45/30) que baja cada segundo.
- Given la cuenta llega a 0, when nadie ha cerrado a mano, then el host cierra automáticamente (`quiz→reveal`) y se reparten los puntos (§5.5).
- Given el host pulsa avanzar antes de 0, when cierra, then se pasa a `reveal`, la cuenta atrás desaparece y el cierre automático no vuelve a dispararse.
- Given un estado fuera de `quiz`, when se muestra, then no hay cuenta atrás.
- Given un jugador reconecta a mitad de `quiz`, when vuelve, then ve el tiempo restante.

## Design Notes
`deadline` es un timestamp absoluto; cada cliente calcula `restante = deadline − Date.now()` y lo
refresca con un intervalo local de 1s (cosmético). La **autoridad** del cierre es el host: un único
`setTimeout` host-side dispara `advance()` (quiz→reveal) al vencer, reusando el reparto de §5.5. El
desfase de reloj entre dispositivos sólo afecta la cuenta atrás mostrada, no el cierre real. El bonus
sigue por orden de llegada (§5.5); pasar a tiempo real sería un cambio aparte.

## Verification
**Commands:**
- `bun run build` -- expected: compila sin errores de tipos.
- `bunx vitest run --root C:/Projects/Tastia` -- expected: tests (incl. `quizDeadline`) en verde.

**Manual checks:**
- `/room/TEST` + `/play/TEST`: al entrar en cada fase aparece la cuenta atrás (30/30/45/30); dejarla
  llegar a 0 → cierra solo y revela/puntúa; repetir cerrando a mano antes → cierra al instante y la
  cuenta desaparece; abrir un 2º Companion a mitad → ve el restante.

## Spec Change Log
- 2026-06-20 · Discovery (1 ronda) + APROBADA por David → `status: ready-for-dev`. Decisiones: `deadline`
  timestamp en RoomState (cuenta atrás cosmética), cierre auto host-autoritativo reusando `advance()`,
  botón manual sigue, bonus se mantiene por orden (§5.5), duraciones 30/30/45/30 como constantes. Depende
  de §5.1/§5.2/§5.5 (rama feat/cata-puntuacion). Bloque `<frozen-after-approval>` bloqueado.
- 2026-06-20 · nch-dev: implementada en `feat/cata-temporizador` (baseline `2c73785`). Build + 36 tests OK.
  Revisión adversarial (3 revisores) → sin defectos medios/altos; §5.5/`computeAwards`/`seq` intactos.
  Diferido: `setTimeout` del host en pestaña en segundo plano (→ `deferred-work.md` T). Resto
  (cosmético / inalcanzable) rechazado. → `done`.

## Suggested Review Order

**Modelo y duraciones (puro)**

- Punto de entrada: `quizDeadline` + `FASE_SECONDS` (30/30/45/30).
  [`session.ts:121`](../../src/lib/session.ts#L121)
- El campo `deadline` en `RoomState`.
  [`session.ts:105`](../../src/lib/session.ts#L105)

**Autoridad del cierre (host)**

- `advance()`: fija/limpia `deadline` al entrar/salir de `quiz`.
  [`use-room-channel.ts:107`](../../src/lib/use-room-channel.ts#L107)
- Timer host-only: `setTimeout` que auto-cierra (reusa `advance()`/§5.5) con re-verificación + cleanup.
  [`use-room-channel.ts:168`](../../src/lib/use-room-channel.ts#L168)

**Cuenta atrás (cosmética)**

- `<Countdown>`: intervalo 1s, mínimo 0, limpieza en cleanup.
  [`Countdown.tsx:16`](../../src/components/Countdown.tsx#L16)
- Render en Sala/Companion durante `quiz`.
  [`room/$code.tsx:159`](../../src/routes/room/$code.tsx#L159)

**Periféricos**

- Test de `quizDeadline`/`FASE_SECONDS`.
  [`session.test.ts`](../../src/lib/session.test.ts)

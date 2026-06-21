---
title: 'Cata gamificada — Taxonomía de vinos (§5.7)'
type: 'feature'
created: '2026-06-20'
status: 'done'
baseline_commit: 'e5c40eb'
context: ['docs/prd-cata-gamificada/prd.md', 'docs/specs/spec-motor-quiz.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La "clasificación" del vino es hoy un string suelto en `DEMO_WINES` y la pregunta de
clasificación mezcla distractores de un pool curado. No hay taxonomía formal
(Tinto/Blanco/Rosado/Espumoso/Cava + subcategorías) que clasifique los vinos ni dé distractores
coherentes (hermanos del mismo tipo).

**Approach:** Crear la **taxonomía como estructura tipada** (la jerarquía del PRD), dar a cada vino un
**tipo + clasificación reales**, y generar la pregunta de "clasificación" con la respuesta = la
clasificación del vino y los distractores = **otras clasificaciones del MISMO tipo**. Se queda en
CÓDIGO con vinos demo reales; el campo en la BD `wines` y la gestión en `/admin` van con §5.6/§5.8.

## Product Decisions
- **Taxonomía tipada en código** (`src/lib/taxonomy.ts`): `WineType` (tinto/blanco/rosado/espumoso/cava)
  → lista de clasificaciones posibles por tipo (de la jerarquía del PRD). BD/admin = §5.6/§5.8.
- **Vinos demo reales y bien clasificados**: cada vino lleva `type` + `classification` reales de la taxonomía.
- **Pregunta de "clasificación":** correcta = `classification` del vino; **distractores = hermanos del mismo `type`** (si faltan, completar con otras clasificaciones plausibles del mismo tipo, sin "(variante N)").
- Determinismo de `getQuestion` intacto (mismo orden en Sala y Companion).

## Boundaries & Constraints
**Always:** la taxonomía es la fuente única de la pregunta de "clasificación"; los distractores salen de
la taxonomía del MISMO tipo del vino; `getQuestion` sigue siendo determinista; reutilizar la baraja
sembrada existente.
**Ask First:** añadir el campo de clasificación/tipo a la tabla `wines` de Supabase (migración) — §5.6/§5.8.
**Never:** tocar BD/migraciones; admin (§5.8); persistencia (§5.9); cambiar las preguntas sensoriales
(vista/olfato/gusto) ni las de variedad/precio (§5.2).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Pregunta de clasificación | vino con `type` + `classification` | correcta = `classification`; 3 distractores = otras clasificaciones del MISMO `type`; orden determinista | tipo con <4 clasificaciones → completar con otras del mismo tipo (nunca cross-tipo ni "(variante N)") |
| Vinos demo reclasificados | los 4 vinos demo | cada uno con `type` + `classification` reales de la taxonomía | — |
| Determinismo | mismo `(wineIndex, fase)` | mismo enunciado + mismo orden en Sala y Companion | — |
| Otras fases intactas | vista/olfato/gusto, variedad, precio | sin cambios respecto a §5.2 | — |

</frozen-after-approval>

## Code Map
- `src/lib/taxonomy.ts` (NUEVO) -- `WineType` + `WINE_TAXONOMY: Record<WineType, string[]>` (clasificaciones por tipo, de la jerarquía del PRD §5.7/FR-14).
- `src/lib/wines.ts` -- `Wine` (añadir `type`), `DEMO_WINES` (reclasificar), `getQuestion` rama clasificación (distractores desde la taxonomía), `FALLBACK_POOLS.classification` (a retirar/derivar de la taxonomía). [verificado, dev]
- `src/lib/session.ts` -- `Fase`, `Question`. [verificado]
- `supabase/migrations/20260618090000_foundation.sql` -- `wines` SIN campo de clasificación (contexto; NO se toca). [verificado]

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/taxonomy.ts` -- NUEVO: `export type WineType = "tinto"|"blanco"|"rosado"|"espumoso"|"cava"`; `export const WINE_TAXONOMY: Record<WineType, string[]>` con las clasificaciones de cada tipo (de la jerarquía del PRD: tinto joven/cosecha/roble/crianza/reserva/gran reserva; blanco barrica/crianza/reserva/gran reserva/sobre lías/depósito inerte/velo de flor; rosado joven/roble/sobre lías; espumoso blanco/rosado; cava crianza/reserva/gran reserva/paraje calificado/brut nature/extra brut/seco). Helper `classificationsFor(type)` y, si útil, `prettyLabel`.
- [x] `src/lib/wines.ts` -- añadir `type: WineType` a `Wine`; reclasificar los 4 demo con `type`+`classification` reales (p. ej. Honoro Vera → tinto/joven; Ramón Bilbao → tinto/crianza; Pazo de Señorans → blanco/depósito inerte; Las Gravas → tinto/crianza); en `getQuestion`, rama clasificación: distractores = `WINE_TAXONOMY[wine.type]` sin la correcta (top-up con el resto del mismo tipo si faltan); retirar el `FALLBACK_POOLS.classification` cross-tipo. Mantener la baraja determinista.
- [x] Test unitario: `WINE_TAXONOMY` (cada tipo tiene sus clasificaciones); la pregunta de clasificación de un vino tinto sólo tiene distractores de tinto; determinismo (mismo orden para un `(i,f)`); cada vino demo tiene `type`+`classification` válidos en la taxonomía.

**Acceptance Criteria:**
- Given un vino `tinto` con clasificación `crianza`, when sale la pregunta de clasificación, then la correcta es "crianza" y los 3 distractores son otras clasificaciones de TINTO (no de blanco ni precios).
- Given Sala y Companion, when ven la pregunta de clasificación, then ven el mismo enunciado y el mismo orden de opciones.
- Given los 4 vinos demo, when se cargan, then cada uno tiene un `type` y una `classification` reales presentes en `WINE_TAXONOMY`.
- Given un tipo con menos de 4 clasificaciones, when faltan hermanos, then se completan con otras del mismo tipo (nunca cross-tipo).
- Given las fases sensoriales / variedad / precio, when se generan, then siguen igual que en §5.2.

## Design Notes
La taxonomía vive en `src/lib/taxonomy.ts` para que §5.6 (banco en BD) y §5.8 (admin) la reutilicen al
clasificar vinos reales. `getQuestion` solo cambia en la rama de clasificación: los distractores pasan a
salir de `WINE_TAXONOMY[wine.type]` (hermanos coherentes) en vez del pool curado mixto. El resto de
fases (sensoriales, variedad, precio) no se tocan. La persistencia del `type`/`classification` en la
tabla `wines` (migración) se hará en §5.6/§5.8.

**Limitación conocida (latente):** para tipos con <4 clasificaciones (espumoso=2, rosado=3) la pregunta
de clasificación tendrá <4 opciones (siempre del mismo tipo, nunca cross-tipo). No afecta a los vinos
demo (tinto/blanco); la política para vinos espumoso/rosado reales se decide en §5.6 (ver `deferred-work.md` → X).

## Verification
**Commands:**
- `bun run build` -- expected: compila sin errores de tipos.
- `bunx vitest run --root C:/Projects/Tastia` -- expected: tests (incl. taxonomía) en verde.

**Manual checks:**
- `/room/TEST` + `/play/TEST`: en la fase de gamificación que toca "clasificación", comprobar que las 4
  opciones son del mismo tipo de vino (p. ej. todas niveles de tinto) y coherentes, con el mismo orden
  en Sala y Companion.

## Spec Change Log
- 2026-06-20 · Discovery (1 ronda) + APROBADA por David → `status: ready-for-dev`. Decisiones: taxonomía
  tipada en `src/lib/taxonomy.ts` (código; BD/admin = §5.6/§5.8); vinos demo reales y bien clasificados
  (`type`+`classification`); distractores de la pregunta de clasificación = hermanos del mismo tipo.
  Bloque `<frozen-after-approval>` bloqueado.
- 2026-06-20 · nch-dev: implementada en `feat/cata-taxonomia` (baseline `e5c40eb`). Build + 43 tests OK.
  Revisión adversarial (3 revisores) → sin defectos en los datos demo. 1 limitación LATENTE: tipos con
  <4 clasificaciones (espumoso/rosado) → pregunta con <4 opciones (no la dispara ningún vino demo) →
  diferida a §5.6 (`deferred-work.md` → X) + documentada en Design Notes. → `done`.

## Suggested Review Order

**Taxonomía (núcleo)**

- Punto de entrada: clasificaciones por tipo (de la jerarquía del PRD).
  [`taxonomy.ts:17`](../../src/lib/taxonomy.ts#L17)
- El tipo `WineType`.
  [`taxonomy.ts:11`](../../src/lib/taxonomy.ts#L11)

**Uso en la pregunta de clasificación**

- Distractores del MISMO tipo del vino.
  [`wines.ts:216`](../../src/lib/wines.ts#L216)
- `getQuestion` (rama de clasificación; el resto de fases sin cambios).
  [`wines.ts:293`](../../src/lib/wines.ts#L293)

**Periféricos**

- Tests de taxonomía.
  [`taxonomy.test.ts`](../../src/lib/taxonomy.test.ts)

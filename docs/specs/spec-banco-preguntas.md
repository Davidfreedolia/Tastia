---
title: 'Cata gamificada — Datos de vinos reales en Supabase + importador (§5.6a)'
type: 'feature'
created: '2026-06-20'
status: 'done'
baseline_commit: '81d8f5e'
context: ['docs/prd-cata-gamificada/prd.md', 'docs/specs/spec-taxonomia.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El juego corre 100% sobre `DEMO_WINES` (código). No hay catálogo de vinos reales en
Supabase ni forma de cargarlos. §5.6a sienta los **datos reales** (FR-12/13, parte de datos).

**Approach:** Migración que añade `wine_type`/`classification` (alineados con la taxonomía §5.7) a
`wines`; **seed de ~8–12 vinos reales** (datos de catálogo público vía web; PVP en `bottle_price_cents`
y coste = PVP−60% en `cost_cents`) con sus `tasting_notes` (ES); y un **importador CSV** preparado
(scaffold) para la tarifa real del distribuidor. El JUEGO NO cambia (sigue en `DEMO_WINES`); servir
estos datos al juego con la edge function anti-spoiler + puntuación en backend es **§5.6b** (siguiente).

## Product Decisions
- **Split de §5.6:** §5.6a = datos + migración + importador (esto); §5.6b = edge function + scoring backend + cablear el juego (diferido).
- **Seed = vinos reales de catálogo público** (web); para la demo, no tarifa privada de distribuidor.
- **Precios:** `bottle_price_cents` = PVP; `cost_cents` = round(PVP × 0,40) (PVP −60%). Precios **orientativos** (copy honesto).
- **`wine_type`/`classification`** en `wines` = claves de la taxonomía (`src/lib/taxonomy.ts`, §5.7).
- **Importador:** scaffold CSV→`wines`+`tasting_notes` con formato documentado; funcional básico o stub claro.
- **Bilingüe:** notas en ES ahora; EN cuando haya datos (las tablas ya tienen `_es`/`_en`).

## Boundaries & Constraints
**Always:** `wine_type`/`classification` válidos en `WINE_TAXONOMY` (§5.7); migración idempotente y con
`down`/reversible donde aplique; respetar la RLS actual (escritura solo admin; SIN lectura pública aún).
**Ask First:** abrir lectura pública o cambiar RLS (eso es §5.6b/edge function); aplicar la migración al
proyecto remoto (el MCP de Supabase está caído → se aplica vía `supabase db push` cuando se decida).
**Never:** edge function (§5.6b); puntuación en backend (§5.6b); cablear el juego fuera de `DEMO_WINES`
(§5.6b); UI de admin (§5.8); tocar la lógica del juego.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Migración aplicada | `supabase db push` | `wines` gana `wine_type` + `classification`; seed de ~8–12 vinos + `tasting_notes` (ES) | reaplicar = idempotente (no duplica) |
| Precios del seed | PVP de cada vino | `bottle_price_cents`=PVP; `cost_cents`=round(PVP×0.40) | — |
| Importador con CSV válido | CSV en el formato documentado | upsert de vinos+notas (por `sku`) | fila inválida → se omite y se reporta |
| Juego en marcha | la app durante §5.6a | sigue jugando sobre `DEMO_WINES` (sin cambios) | — |

</frozen-after-approval>

## Code Map
- `supabase/migrations/20260618090000_foundation.sql` -- `wines` (sin type/classification) + `tasting_notes` (vista/nariz/boca ES+EN). [verificado]
- `supabase/migrations/20260618090500_admin_access.sql` -- RLS: wines/tasting_notes escritura solo admin. [verificado]
- `src/lib/taxonomy.ts` -- `WINE_TAXONOMY` (valores válidos de `classification`/`type`). [verificado]
- `src/lib/wines.ts` -- `DEMO_WINES` (referencia de campos; el juego sigue usándolo). [verificado]

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<ts>_wines_taxonomy.sql` -- NUEVO: `alter table wines add column if not exists wine_type text, add column if not exists classification text` (+ comentarios referenciando la taxonomía §5.7). Idempotente.
- [x] `supabase/migrations/<ts>_seed_wines_demo.sql` -- NUEVO: insertar ~8–12 vinos reales (sourced de catálogo público vía WebSearch en implementación) con `name/bodega/region_es/grape/vintage/wine_type/classification`, `bottle_price_cents`=PVP, `cost_cents`=round(PVP×0.40), y su `tasting_notes` (vista_es/nariz_es/boca_es/curiosidad_es). `insert ... on conflict (sku) do nothing` (idempotente). `wine_type`/`classification` ∈ `WINE_TAXONOMY`.
- [x] `scripts/import-wines.mjs` -- NUEVO (scaffold): lee un CSV (formato documentado en cabecera: sku,name,bodega,region,grape,vintage,wine_type,classification,pvp_eur + columnas de nota de cata) y hace upsert en `wines`+`tasting_notes` por `sku`, calculando `cost_cents`=round(pvp×0.40). Usa la service key (no commitear claves). Documentar el formato y el uso.
- [x] Test unitario del helper de parsing/precio del importador (CSV→registro; `cost = round(pvp*0.40)`), sin tocar la red/BD.

**Acceptance Criteria:**
- Given la migración de taxonomía, when se aplica, then `wines` tiene `wine_type` y `classification` (texto) y reaplicarla no falla.
- Given el seed, when se aplica, then existen ~8–12 vinos reales con `tasting_notes` ES, `bottle_price_cents`=PVP y `cost_cents`=round(PVP×0.40), con `wine_type`/`classification` presentes en `WINE_TAXONOMY`.
- Given el importador con un CSV válido, when se ejecuta, then hace upsert por `sku` (sin duplicar) y omite/reporta filas inválidas.
- Given el juego, when se usa durante §5.6a, then sigue funcionando sobre `DEMO_WINES` (no se cablea a la BD aquí).

## Design Notes
§5.6a es solo la **capa de datos**: deja vinos reales + notas en Supabase y un importador listo, sin
tocar el juego (que sigue en `DEMO_WINES`) ni la RLS pública. La edge function que sirve esos datos sin
la respuesta + la puntuación en backend + cablear el juego es **§5.6b**. El seed se obtiene de un
catálogo público (web) en implementación; la tarifa real del distribuidor se cargará luego con el
importador. Aplicar las migraciones al remoto se hará con `supabase db push` (el MCP está caído).

## Verification
**Commands:**
- `bun run build` -- expected: compila (si el importador es TS) sin errores.
- `bunx vitest run --root C:/Projects/Tastia` -- expected: tests (incl. parsing del importador) en verde.
- (manual/deploy) `supabase db push` -- aplica migración + seed cuando se decida (MCP caído ahora).

**Manual checks:**
- Revisar el SQL de migración + seed (parsea, idempotente, precios y taxonomía correctos). Tras
  `supabase db push`, comprobar en Studio que los vinos y `tasting_notes` están y que `cost_cents` ≈ 40% del PVP.

## Spec Change Log
- 2026-06-20 · Discovery + APROBADA por David → `status: ready-for-dev`. Decisiones: §5.6 PARTIDA en
  §5.6a (datos: migración + seed real vía web + importador) y §5.6b (edge function + scoring backend +
  cablear el juego, diferido). Seed de catálogo público; PVP + cost−60%; taxonomía §5.7; importador
  scaffold; ES ahora; RLS sin cambios (lectura pública = §5.6b). Depende de §5.7. Bloque
  `<frozen-after-approval>` bloqueado.
- 2026-06-20 · nch-dev: implementada en `feat/cata-datos` (baseline `81d8f5e`). 12 vinos reales + importador.
  Build OK · 54 tests. La revisión adversarial por sub-agentes NO pudo correr (clasificador del modelo
  caído) → **revisión MANUAL del orquestador**: SQL (columnas, idempotencia, taxonomía EXACTA, cost=40% PVP,
  `price_band` ∈ enum) e importador (parsing robusto, validación, sin secretos) — sin defectos. → `done`.

## Suggested Review Order

**Migraciones (capa de datos)**

- Taxonomía en `wines` (añade `wine_type`/`classification`).
  [`20260620120000_wines_taxonomy.sql`](../../supabase/migrations/20260620120000_wines_taxonomy.sql)
- Seed de 12 vinos reales + `tasting_notes` (idempotente; cost=40% PVP).
  [`20260620120100_seed_wines_demo.sql`](../../supabase/migrations/20260620120100_seed_wines_demo.sql)

**Importador CSV**

- Helpers puros (precio, parsing, validación de taxonomía).
  [`import-wines.lib.mjs`](../../scripts/import-wines.lib.mjs)
- Script de upsert (service key por env; `--dry-run`).
  [`import-wines.mjs`](../../scripts/import-wines.mjs)

**Periféricos**

- Tests del importador.
  [`import-wines.test.ts`](../../src/lib/import-wines.test.ts)

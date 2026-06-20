-- Tastia · 0009 — Taxonomía de vinos en `wines` (§5.6a / §5.7)
-- Añade `wine_type` + `classification` a la tabla `wines` para persistir la taxonomía que
-- hoy vive solo en código (`src/lib/taxonomy.ts`, §5.7). Los VALORES válidos son:
--   wine_type      ∈ {tinto, blanco, rosado, espumoso, cava}        (WineType)
--   classification ∈ WINE_TAXONOMY[wine_type]                       (hermanos del mismo tipo)
-- Texto libre (no enum) a propósito: la taxonomía es la fuente de verdad en código y puede
-- crecer sin migrar el enum; la validación de pertenencia vive en la app/importador (§5.6a)
-- y, más adelante, en la edge function que sirve estos datos (§5.6b).
--
-- Idempotente: `add column if not exists` → reaplicar no falla ni duplica.
-- NO cambia la RLS (escritura solo admin; lectura pública = §5.6b).

alter table wines add column if not exists wine_type text;
alter table wines add column if not exists classification text;

comment on column wines.wine_type is
  'Tipo de vino (raíz de la taxonomía §5.7): tinto|blanco|rosado|espumoso|cava. Ver src/lib/taxonomy.ts (WineType).';
comment on column wines.classification is
  'Clasificación dentro del tipo (§5.7): miembro de WINE_TAXONOMY[wine_type]. Ver src/lib/taxonomy.ts.';

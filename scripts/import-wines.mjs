// Tastia · Importador de tarifa de vinos CSV → Supabase (§5.6a)
// =============================================================================
// QUÉ HACE
//   Lee un CSV con la tarifa del distribuidor y hace UPSERT (por `sku`) en:
//     - `wines`         (catálogo + category + classification_id + precios)
//     - `tasting_notes` (notas de cata ES, 1:1 con el vino)
//   Calcula `cost_cents = round(pvp_eur × 100 × 0.40)` (PVP − 60%) y
//   `bottle_price_cents = round(pvp_eur × 100)`. Valida cada fila; las inválidas
//   se OMITEN y se reportan (no abortan el import).
//
// ESQUEMA REAL (Salvador, PR #7, ya aplicado): `wines.category` (enum wine_category) +
//   `wines.classification_id` (FK → wine_classifications.id). El CSV trae `classification_slug`
//   legible; este script lo resuelve a `classification_id` consultando UNA vez la tabla
//   `wine_classifications` por (category, slug).
//
// FORMATO CSV (cabecera obligatoria; el orden es de referencia, se lee por nombre):
//   sku,name,bodega,region,grape,vintage,category,classification_slug,pvp_eur,vista,nariz,boca,curiosidad
//   - region        → wines.region_es
//   - vista/nariz/boca/curiosidad → tasting_notes (_es); pueden ir vacías
//   - category ∈ {tinto,blanco,rosado,espumoso,cava}; classification_slug ∈ WINE_CLASSIFICATIONS[category]
//   - pvp_eur admite coma o punto decimal (p. ej. "10,30" o "10.30")
//   Ejemplo de fila:
//   TAS-W-EJEMPLO,Mi Vino,Mi Bodega,Rioja,Tempranillo,2021,tinto,crianza,12.50,Rojo rubí,Fruta roja,Redondo,Una curiosidad
//
// USO
//   1) Exporta la service key (NUNCA se commitea ni se imprime):
//        export SUPABASE_URL="https://<project-ref>.supabase.co"
//        export SUPABASE_SERVICE_KEY="<service_role key>"
//   2) Ejecuta:
//        bun scripts/import-wines.mjs ruta/a/tarifa.csv
//        (o: node scripts/import-wines.mjs ruta/a/tarifa.csv)
//      Modo simulación (no escribe ni consulta la BD, solo valida y reporta):
//        bun scripts/import-wines.mjs ruta/a/tarifa.csv --dry-run
//
// NOTA: la escritura en `wines`/`tasting_notes` está protegida por RLS (solo admin);
// la service key salta la RLS. No abre lectura pública (eso es §5.6b).
// =============================================================================

import { readFileSync } from "node:fs";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import { parseWinesCsv } from "./import-wines.lib.mjs";

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const csvPath = args.find((a) => !a.startsWith("--"));

if (!csvPath) {
  fail(
    "uso: bun scripts/import-wines.mjs <ruta.csv> [--dry-run]\n" +
      "     requiere env SUPABASE_URL + SUPABASE_SERVICE_KEY (salvo --dry-run)",
  );
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

let text;
try {
  text = readFileSync(csvPath, "utf8");
} catch (e) {
  fail(`no se pudo leer el CSV "${csvPath}": ${e.message}`);
}

const { records, errors } = parseWinesCsv(text);

console.log(`· Filas válidas:   ${records.length}`);
console.log(`· Filas omitidas:  ${errors.length}`);
for (const e of errors) {
  console.warn(`  ⚠ línea ${e.line}${e.sku ? ` (sku ${e.sku})` : ""}: ${e.reason}`);
}

if (records.length === 0) {
  console.log("Nada que importar.");
  process.exit(errors.length > 0 ? 1 : 0);
}

if (dryRun) {
  console.log("\n--dry-run: no se escribe ni se consulta la BD. Muestra de registros:");
  for (const { wine, note } of records.slice(0, 3)) {
    console.log(
      `  ${wine.sku} · ${wine.name} · ${wine.category}/${wine.classification_slug} · ` +
        `PVP ${(wine.bottle_price_cents / 100).toFixed(2)}€ · coste ${(wine.cost_cents / 100).toFixed(2)}€` +
        `${note ? " · +nota" : ""}`,
    );
  }
  process.exit(errors.length > 0 ? 1 : 0);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  fail("faltan env SUPABASE_URL y/o SUPABASE_SERVICE_KEY (necesarias para escribir).");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Mapa de resolución (category|slug) → classification_id, consultado UNA vez a la tabla real.
const { data: classRows, error: classErr } = await supabase
  .from("wine_classifications")
  .select("id, category, slug");
if (classErr || !classRows) {
  fail(`no se pudo leer wine_classifications: ${classErr?.message ?? "sin datos"}`);
}
const classIdByKey = new Map(classRows.map((c) => [`${c.category}|${c.slug}`, c.id]));

let okWines = 0;
let okNotes = 0;
let failures = 0;

for (const { wine, note } of records) {
  // Traduce (category, classification_slug) → classification_id contra el catálogo de Salvador.
  const { classification_slug, ...wineRest } = wine;
  const classificationId = classIdByKey.get(`${wine.category}|${classification_slug}`);
  if (!classificationId) {
    failures++;
    console.warn(
      `  ⚠ ${wine.sku}: sin classification_id para ${wine.category}/${classification_slug} ` +
        `(no existe en wine_classifications)`,
    );
    continue;
  }

  // Upsert del vino por `sku` y recuperamos su id para la nota de cata (FK).
  const { data: upserted, error: wineErr } = await supabase
    .from("wines")
    .upsert(
      { ...wineRest, classification_id: classificationId },
      { onConflict: "sku" },
    )
    .select("id")
    .single();

  if (wineErr || !upserted) {
    failures++;
    console.warn(`  ⚠ ${wine.sku}: error al upsert del vino: ${wineErr?.message ?? "sin id"}`);
    continue;
  }
  okWines++;

  if (note) {
    const { error: noteErr } = await supabase
      .from("tasting_notes")
      .upsert({ wine_id: upserted.id, ...note }, { onConflict: "wine_id" });
    if (noteErr) {
      failures++;
      console.warn(`  ⚠ ${wine.sku}: error al upsert de la nota: ${noteErr.message}`);
    } else {
      okNotes++;
    }
  }
}

console.log(`\n✓ Vinos upsertados:  ${okWines}`);
console.log(`✓ Notas upsertadas:  ${okNotes}`);
if (failures > 0) console.log(`⚠ Errores de escritura: ${failures}`);
process.exit(failures > 0 || errors.length > 0 ? 1 : 0);

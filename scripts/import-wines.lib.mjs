// Tastia · Importador de vinos — helpers PUROS (§5.6a)
// Sin red ni BD: parseo de CSV, mapeo fila→registro y cálculo de precios. Lo importan tanto
// `scripts/import-wines.mjs` (upsert real vía Supabase) como `src/lib/import-wines.test.ts`.
//
// ESQUEMA REAL (fuente de verdad = Salvador, PR #7, ya aplicado en Supabase):
//   - enum `wine_category` = tinto | blanco | rosado | espumoso | cava
//   - tabla `wine_classifications (category wine_category, slug text, ...)`, unique(category, slug)
//   - `wines.category` (wine_category) + `wines.classification_id` (FK → wine_classifications.id)
// El importador NO toca el esquema: valida (category, classification_slug) contra el catálogo
// de Salvador (espejo `WINE_CLASSIFICATIONS` abajo) y el .mjs resuelve `classification_id`
// consultando `wine_classifications` por (category, slug).
//
// REGLA DE PRECIO (§5.6a): cost_cents = round(pvp_eur × 100 × 0.40)  (PVP − 60%).
//             bottle_price_cents = round(pvp_eur × 100).
//
// FORMATO CSV (cabecera obligatoria; el parseo es por NOMBRE de columna):
//   sku,name,bodega,region,grape,vintage,category,classification_slug,pvp_eur,vista,nariz,boca,curiosidad
// - `region`  → se guarda en wines.region_es.
// - `vista/nariz/boca/curiosidad` → tasting_notes (_es). Pueden ir vacías.
// - `category` ∈ WINE_CATEGORIES; `classification_slug` ∈ WINE_CLASSIFICATIONS[category].

// Espejo del seed de Salvador (`wine_classifications`): category → [slug, ...].
// Es la lista de slugs sembrados en la BD; la validación de pertenencia vive aquí (puro) y la
// resolución a `classification_id` la hace el .mjs consultando la tabla real.
export const WINE_CLASSIFICATIONS = {
  tinto: ["joven", "cosecha", "roble", "crianza", "reserva", "gran_reserva"],
  blanco: [
    "barrica_crianza",
    "barrica_reserva",
    "barrica_gran_reserva",
    "lias_con_battonage",
    "lias_sin_battonage",
    "deposito_inerte",
    "velo_flor",
  ],
  rosado: ["joven", "roble", "lias_con_battonage", "lias_sin_battonage"],
  espumoso: ["color_blanco", "color_rosa"],
  cava: [
    "crianza",
    "reserva",
    "gran_reserva",
    "paraje_calificado",
    "brut_nature",
    "extra_brut",
    "seco",
  ],
};

export const WINE_CATEGORIES = Object.keys(WINE_CLASSIFICATIONS);

/** Columnas esperadas en la cabecera del CSV (orden de referencia). */
export const CSV_COLUMNS = [
  "sku",
  "name",
  "bodega",
  "region",
  "grape",
  "vintage",
  "category",
  "classification_slug",
  "pvp_eur",
  "vista",
  "nariz",
  "boca",
  "curiosidad",
];

/** PVP (€) → céntimos del PVP de botella. */
export function bottlePriceCents(pvpEur) {
  return Math.round(pvpEur * 100);
}

/** PVP (€) → coste de compra en céntimos (PVP − 60%). REGLA §5.6a. */
export function costCents(pvpEur) {
  return Math.round(pvpEur * 100 * 0.4);
}

/** ¿`category`+`classification_slug` son miembros válidos del catálogo de Salvador? */
export function isValidClassification(category, classificationSlug) {
  const list = WINE_CLASSIFICATIONS[category];
  return Array.isArray(list) && list.includes(classificationSlug);
}

/**
 * Parser CSV mínimo (RFC-4180-ish): soporta comillas dobles, comas dentro de comillas y
 * "" como comilla escapada. Suficiente para tarifas exportadas de hoja de cálculo.
 * Devuelve array de arrays de strings (sin interpretar la cabecera).
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  // Normaliza saltos de línea y quita BOM.
  const s = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  // Último campo/fila si el archivo no acaba en salto de línea.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Descarta filas totalmente vacías (p. ej. línea final en blanco).
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

/**
 * Convierte el texto CSV completo en `{ records, errors }`:
 *  - `records`: filas VÁLIDAS ya mapeadas a registros listos para upsert.
 *  - `errors`:  `{ line, sku, reason }` por cada fila inválida (se omite, se reporta).
 * No toca red ni BD. La cabecera debe contener al menos las columnas obligatorias.
 */
export function parseWinesCsv(text) {
  const rows = parseCsv(text);
  const records = [];
  const errors = [];
  if (rows.length === 0) {
    return { records, errors: [{ line: 0, sku: "", reason: "CSV vacío" }] };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (name) => header.indexOf(name);
  const required = ["sku", "name", "category", "classification_slug", "pvp_eur"];
  const missing = required.filter((c) => idx(c) === -1);
  if (missing.length > 0) {
    return {
      records,
      errors: [{ line: 1, sku: "", reason: `cabecera sin columnas: ${missing.join(", ")}` }],
    };
  }

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const get = (name) => {
      const i = idx(name);
      return i === -1 ? "" : (cells[i] ?? "").trim();
    };
    const result = mapRowToRecord(get);
    if (result.error) {
      errors.push({ line: r + 1, sku: get("sku"), reason: result.error });
    } else {
      records.push(result.record);
    }
  }
  return { records, errors };
}

/**
 * Mapea UNA fila (accesor `get(columnName)`) a un registro `{ wine, note }`, o a `{ error }`
 * si es inválida. Función PURA — el corazón testeable del importador. NO resuelve la FK:
 * emite `category` + `classification_slug`; el .mjs traduce el slug a `classification_id`.
 */
export function mapRowToRecord(get) {
  const sku = get("sku");
  const name = get("name");
  const category = get("category");
  const classificationSlug = get("classification_slug");
  const pvpRaw = get("pvp_eur").replace(",", "."); // admite coma decimal europea

  if (!sku) return { error: "sku vacío" };
  if (!name) return { error: "name vacío" };

  const pvp = Number(pvpRaw);
  if (!Number.isFinite(pvp) || pvp <= 0) {
    return { error: `pvp_eur inválido: "${get("pvp_eur")}"` };
  }
  if (!WINE_CATEGORIES.includes(category)) {
    return { error: `category inválida: "${category}" (∉ wine_category)` };
  }
  if (!isValidClassification(category, classificationSlug)) {
    return {
      error: `clasificación inválida: category="${category}" / classification_slug="${classificationSlug}" (∉ wine_classifications)`,
    };
  }

  const vintageRaw = get("vintage");
  let vintage = null;
  if (vintageRaw) {
    const v = Number(vintageRaw);
    if (!Number.isInteger(v) || v < 1900 || v > 2100) {
      return { error: `vintage inválido: "${vintageRaw}"` };
    }
    vintage = v;
  }

  const wine = {
    sku,
    name,
    bodega: get("bodega") || null,
    region_es: get("region") || null,
    grape: get("grape") || null,
    vintage,
    category,
    classification_slug: classificationSlug,
    bottle_price_cents: bottlePriceCents(pvp),
    cost_cents: costCents(pvp),
  };

  // Nota de cata: solo si hay al menos un campo (vista/nariz/boca/curiosidad).
  const vista = get("vista") || null;
  const nariz = get("nariz") || null;
  const boca = get("boca") || null;
  const curiosidad = get("curiosidad") || null;
  const hasNote = vista || nariz || boca || curiosidad;
  const note = hasNote
    ? { vista_es: vista, nariz_es: nariz, boca_es: boca, curiosidad_es: curiosidad }
    : null;

  return { record: { wine, note } };
}

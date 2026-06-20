// Tastia · Importador de vinos — helpers PUROS (§5.6a)
// Sin red ni BD: parseo de CSV, mapeo fila→registro y cálculo de precios. Lo importan tanto
// `scripts/import-wines.mjs` (upsert real vía Supabase) como `src/lib/import-wines.test.ts`.
//
// REGLA DE PRECIO (§5.6a): cost_cents = round(pvp_eur × 100 × 0.40)  (PVP − 60%).
//             bottle_price_cents = round(pvp_eur × 100).
//
// FORMATO CSV (cabecera obligatoria, en este orden lógico; el parseo es por NOMBRE de columna):
//   sku,name,bodega,region,grape,vintage,wine_type,classification,pvp_eur,vista,nariz,boca,curiosidad
// - `region`  → se guarda en wines.region_es.
// - `vista/nariz/boca/curiosidad` → tasting_notes (_es). Pueden ir vacías.
// - `wine_type` ∈ WINE_TYPES; `classification` ∈ WINE_TAXONOMY[wine_type] (§5.7).

// Copia FROZEN de la taxonomía (§5.7, espejo de src/lib/taxonomy.ts). El test cruza esta copia
// contra taxonomy.ts para que no se desincronicen. Se duplica aquí para que el .mjs sea
// ejecutable por Node sin pasar por el build de TS.
export const WINE_TAXONOMY = {
  tinto: ["joven", "cosecha", "roble", "crianza", "reserva", "gran reserva"],
  blanco: [
    "joven",
    "barrica",
    "crianza",
    "reserva",
    "gran reserva",
    "sobre lías",
    "depósito inerte",
    "velo de flor",
  ],
  rosado: ["joven", "roble", "sobre lías"],
  espumoso: ["blanco", "rosado"],
  cava: [
    "crianza",
    "reserva",
    "gran reserva",
    "paraje calificado",
    "brut nature",
    "extra brut",
    "seco",
  ],
};

export const WINE_TYPES = Object.keys(WINE_TAXONOMY);

/** Columnas esperadas en la cabecera del CSV (orden de referencia). */
export const CSV_COLUMNS = [
  "sku",
  "name",
  "bodega",
  "region",
  "grape",
  "vintage",
  "wine_type",
  "classification",
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

/** ¿`type`+`classification` son miembros válidos de la taxonomía (§5.7)? */
export function isValidTaxonomy(wineType, classification) {
  const list = WINE_TAXONOMY[wineType];
  return Array.isArray(list) && list.includes(classification);
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
  const required = ["sku", "name", "wine_type", "classification", "pvp_eur"];
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
 * si es inválida. Función PURA — el corazón testeable del importador.
 */
export function mapRowToRecord(get) {
  const sku = get("sku");
  const name = get("name");
  const wineType = get("wine_type");
  const classification = get("classification");
  const pvpRaw = get("pvp_eur").replace(",", "."); // admite coma decimal europea

  if (!sku) return { error: "sku vacío" };
  if (!name) return { error: "name vacío" };

  const pvp = Number(pvpRaw);
  if (!Number.isFinite(pvp) || pvp <= 0) {
    return { error: `pvp_eur inválido: "${get("pvp_eur")}"` };
  }
  if (!isValidTaxonomy(wineType, classification)) {
    return {
      error: `taxonomía inválida: wine_type="${wineType}" / classification="${classification}" (§5.7)`,
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
    wine_type: wineType,
    classification,
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

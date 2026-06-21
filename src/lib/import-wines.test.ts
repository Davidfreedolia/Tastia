// @ts-nocheck — interfaz con `scripts/import-wines.lib.mjs` (script Node SIN tipos); la corrección
// se valida en runtime con vitest. Evita TS7016 (módulo .mjs sin .d.ts) en `tsc --noEmit`.
// Tests del importador de vinos CSV (§5.6a) — helpers PUROS, sin red ni BD.
// Cubren: cálculo de precios (cost = round(pvp*100*0.40), bottle = round(pvp*100)),
// el mapeo fila→registro, el parseo del CSV completo (válidas vs. omitidas+reportadas),
// y la validación de (category, classification_slug) contra el catálogo de Salvador
// (`wine_classifications`, espejo en WINE_CLASSIFICATIONS).
import { describe, expect, it } from "vitest";
import {
  bottlePriceCents,
  costCents,
  isValidClassification,
  mapRowToRecord,
  parseWinesCsv,
  WINE_CATEGORIES,
  WINE_CLASSIFICATIONS,
} from "../../scripts/import-wines.lib.mjs";

describe("precio del importador (§5.6a)", () => {
  it("cost_cents = round(pvp × 100 × 0.40)", () => {
    expect(costCents(10)).toBe(400);
    expect(costCents(10.3)).toBe(412); // 1030 * 0.4 = 412
    expect(costCents(8.85)).toBe(354); // 885 * 0.4 = 354
    expect(costCents(24.5)).toBe(980);
    expect(costCents(17.05)).toBe(682); // 1705 * 0.4 = 682
  });

  it("bottle_price_cents = round(pvp × 100)", () => {
    expect(bottlePriceCents(10)).toBe(1000);
    expect(bottlePriceCents(10.3)).toBe(1030);
    expect(bottlePriceCents(8.85)).toBe(885);
  });

  it("redondea correctamente decimales no exactos", () => {
    // 7.99 → 799 ; 799 * 0.4 = 319.6 → round → 320
    expect(bottlePriceCents(7.99)).toBe(799);
    expect(costCents(7.99)).toBe(320);
  });
});

describe("validación de clasificación (esquema de Salvador)", () => {
  it("las categorías son exactamente el enum wine_category", () => {
    expect(WINE_CATEGORIES).toEqual(["tinto", "blanco", "rosado", "espumoso", "cava"]);
  });

  it("acepta pares (category, slug) válidos y rechaza inválidos / cross-categoría", () => {
    expect(isValidClassification("tinto", "crianza")).toBe(true);
    expect(isValidClassification("tinto", "gran_reserva")).toBe(true);
    expect(isValidClassification("cava", "brut_nature")).toBe(true);
    expect(isValidClassification("espumoso", "color_blanco")).toBe(true);
    expect(isValidClassification("blanco", "lias_sin_battonage")).toBe(true);
    expect(isValidClassification("tinto", "brut_nature")).toBe(false); // cross-categoría
    expect(isValidClassification("tinto", "inexistente")).toBe(false);
    expect(isValidClassification("naranja", "joven")).toBe(false); // categoría inexistente
    // Slugs antiguos (taxonomía del juego) ya NO son válidos en el esquema de Salvador.
    expect(isValidClassification("tinto", "gran reserva")).toBe(false);
    expect(isValidClassification("blanco", "sobre lías")).toBe(false);
    expect(isValidClassification("espumoso", "blanco")).toBe(false);
  });

  it("el espejo WINE_CLASSIFICATIONS coincide con el seed de wine_classifications", () => {
    expect(WINE_CLASSIFICATIONS).toEqual({
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
    });
  });
});

// Accesor de columnas a partir de un objeto fila (simula get(name) del parser).
const getter = (obj: Record<string, string>) => (name: string) => obj[name] ?? "";

describe("mapRowToRecord — fila → registro (puro)", () => {
  it("mapea una fila válida a { wine, note } con precios calculados", () => {
    const r = mapRowToRecord(
      getter({
        sku: "TAS-W-TEST",
        name: "Vino Test",
        bodega: "Bodega Test",
        region: "Rioja",
        grape: "Tempranillo",
        vintage: "2021",
        category: "tinto",
        classification_slug: "crianza",
        pvp_eur: "12,50", // coma decimal europea
        vista: "Rojo rubí",
        nariz: "Fruta roja",
        boca: "Redondo",
        curiosidad: "Algo curioso",
      }),
    );
    expect(r.error).toBeUndefined();
    expect(r.record.wine).toMatchObject({
      sku: "TAS-W-TEST",
      name: "Vino Test",
      region_es: "Rioja",
      vintage: 2021,
      category: "tinto",
      classification_slug: "crianza",
      bottle_price_cents: 1250,
      cost_cents: 500,
    });
    // El registro puro NO resuelve la FK: emite category + slug, nunca classification_id.
    expect(r.record.wine).not.toHaveProperty("classification_id");
    expect(r.record.note).toMatchObject({
      vista_es: "Rojo rubí",
      nariz_es: "Fruta roja",
      boca_es: "Redondo",
      curiosidad_es: "Algo curioso",
    });
  });

  it("deja note=null si no hay ningún campo de cata", () => {
    const r = mapRowToRecord(
      getter({
        sku: "TAS-W-NONOTE",
        name: "Sin Nota",
        category: "blanco",
        classification_slug: "deposito_inerte",
        pvp_eur: "5",
      }),
    );
    expect(r.error).toBeUndefined();
    expect(r.record.note).toBeNull();
    expect(r.record.wine.vintage).toBeNull();
  });

  it("rechaza sku vacío, name vacío, pvp inválido, category/clasificación inválida y vintage inválido", () => {
    const base = {
      sku: "X",
      name: "N",
      category: "tinto",
      classification_slug: "crianza",
      pvp_eur: "10",
    };
    expect(mapRowToRecord(getter({ ...base, sku: "" })).error).toMatch(/sku/);
    expect(mapRowToRecord(getter({ ...base, name: "" })).error).toMatch(/name/);
    expect(mapRowToRecord(getter({ ...base, pvp_eur: "gratis" })).error).toMatch(/pvp_eur/);
    expect(mapRowToRecord(getter({ ...base, pvp_eur: "0" })).error).toMatch(/pvp_eur/);
    expect(mapRowToRecord(getter({ ...base, category: "naranja" })).error).toMatch(/category/);
    expect(
      mapRowToRecord(getter({ ...base, classification_slug: "brut_nature" })).error,
    ).toMatch(/clasificaci/);
    expect(mapRowToRecord(getter({ ...base, vintage: "99" })).error).toMatch(/vintage/);
  });
});

describe("parseWinesCsv — CSV completo (válidas vs. omitidas)", () => {
  const HEADER =
    "sku,name,bodega,region,grape,vintage,category,classification_slug,pvp_eur,vista,nariz,boca,curiosidad";

  it("separa filas válidas e inválidas y reporta línea + motivo", () => {
    const csv = [
      HEADER,
      "TAS-1,Vino Uno,Bodega A,Rioja,Tempranillo,2020,tinto,crianza,10.30,Rojo,Fruta,Redondo,Curiosa",
      "TAS-2,Vino Dos,Bodega B,Rueda,Verdejo,2024,tinto,brut_nature,8.00,,,,", // clasificación cross-categoría
      'TAS-3,Vino Tres,Bodega C,Cava,"Macabeo, Xarel·lo",2019,cava,brut_nature,18.90,,,,', // coma dentro de comillas
      ",Sin SKU,,,,,tinto,joven,5,,,,", // sku vacío
    ].join("\n");

    const { records, errors } = parseWinesCsv(csv);
    expect(records).toHaveLength(2); // TAS-1 y TAS-3
    expect(records.map((r) => r.wine.sku)).toEqual(["TAS-1", "TAS-3"]);
    // El campo entrecomillado con coma se preserva entero.
    expect(records[1].wine.grape).toBe("Macabeo, Xarel·lo");
    expect(records[0].wine.cost_cents).toBe(412);

    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatchObject({ line: 3, sku: "TAS-2" });
    expect(errors[0].reason).toMatch(/clasificaci/);
    expect(errors[1].reason).toMatch(/sku/);
  });

  it("reporta cabecera incompleta sin reventar", () => {
    const { records, errors } = parseWinesCsv("sku,name\nTAS-1,Vino");
    expect(records).toHaveLength(0);
    expect(errors[0].reason).toMatch(/cabecera/);
  });

  it("CSV vacío → error controlado", () => {
    const { records, errors } = parseWinesCsv("");
    expect(records).toHaveLength(0);
    expect(errors[0].reason).toMatch(/vac/);
  });
});

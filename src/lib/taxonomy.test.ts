// Tests de la taxonomía de vinos (§5.7). Cubren: forma de `WINE_TAXONOMY` (cada tipo con sus
// clasificaciones), que la pregunta de clasificación de un vino TINTO solo tiene distractores de
// tinto (nunca cross-tipo ni precios/variedades), el determinismo del orden para un `(i,f)` dado,
// y que cada vino demo tiene un `type` + `classification` reales presentes en la taxonomía.
import { describe, expect, it } from "vitest";
import { classificationsFor, WINE_TAXONOMY, type WineType } from "./taxonomy";
import { DEMO_WINES, getQuestion } from "./wines";

const ALL_TYPES: WineType[] = ["tinto", "blanco", "rosado", "espumoso", "cava"];

describe("WINE_TAXONOMY — forma de la taxonomía (§5.7)", () => {
  it("define los 5 tipos de vino, cada uno con clasificaciones no vacías y únicas", () => {
    for (const type of ALL_TYPES) {
      const classifications = WINE_TAXONOMY[type];
      expect(Array.isArray(classifications)).toBe(true);
      expect(classifications.length).toBeGreaterThan(0);
      expect(new Set(classifications).size).toBe(classifications.length); // sin duplicados
    }
  });

  it("contiene las clasificaciones clave de la jerarquía del PRD por tipo", () => {
    expect(WINE_TAXONOMY.tinto).toContain("crianza");
    expect(WINE_TAXONOMY.tinto).toContain("gran reserva");
    expect(WINE_TAXONOMY.blanco).toContain("depósito inerte");
    expect(WINE_TAXONOMY.blanco).toContain("velo de flor");
    expect(WINE_TAXONOMY.rosado).toContain("sobre lías");
    expect(WINE_TAXONOMY.espumoso).toEqual(["blanco", "rosado"]);
    expect(WINE_TAXONOMY.cava).toContain("paraje calificado");
    expect(WINE_TAXONOMY.cava).toContain("brut nature");
  });

  it("classificationsFor devuelve una COPIA (no muta la taxonomía)", () => {
    const copy = classificationsFor("tinto");
    expect(copy).toEqual(WINE_TAXONOMY.tinto);
    copy.push("inventada");
    expect(WINE_TAXONOMY.tinto).not.toContain("inventada");
  });
});

describe("vinos demo — type + classification válidos (§5.7)", () => {
  it("cada vino demo tiene un type real y una classification presente en WINE_TAXONOMY[type]", () => {
    for (const wine of DEMO_WINES) {
      expect(ALL_TYPES).toContain(wine.type);
      expect(WINE_TAXONOMY[wine.type]).toContain(wine.classification);
    }
  });
});

/** Índice del vino cuya pregunta de gamificación es la de CLASIFICACIÓN (rota grape→clasif→precio). */
function classificationWineIndex(): number {
  // La rotación es `wineIndex % 3 === 1` → clasificación. Buscamos uno determinista presente.
  const i = DEMO_WINES.findIndex((w) => w.index % 3 === 1);
  expect(i).toBeGreaterThanOrEqual(0);
  return i;
}

describe("pregunta de clasificación — distractores del MISMO tipo (§5.7)", () => {
  it("un vino TINTO solo ofrece clasificaciones de tinto (sin cross-tipo ni precios)", () => {
    const i = classificationWineIndex();
    const wine = DEMO_WINES[i];
    expect(wine.type).toBe<WineType>("tinto"); // wine 1 (Ramón Bilbao) es tinto/crianza

    const q = getQuestion(i, "gamificacion");
    expect(q.options[q.correctIndex]).toBe(wine.classification); // correcta = su clasificación

    // TODAS las opciones (correcta + distractores) son clasificaciones de TINTO.
    for (const opt of q.options) {
      expect(WINE_TAXONOMY.tinto).toContain(opt);
    }
    // Ninguna opción es de otro tipo, ni precio, ni variedad.
    const otherTypes: WineType[] = ["blanco", "rosado", "espumoso", "cava"];
    for (const opt of q.options) {
      const inOtherTypeOnly = otherTypes.some(
        (t) => WINE_TAXONOMY[t].includes(opt) && !WINE_TAXONOMY.tinto.includes(opt),
      );
      expect(inOtherTypeOnly).toBe(false);
    }
  });

  it("siempre 4 opciones distintas con un correctIndex válido", () => {
    const i = classificationWineIndex();
    const q = getQuestion(i, "gamificacion");
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options).size).toBe(4);
    expect(q.correctIndex).toBeGreaterThanOrEqual(0);
    expect(q.correctIndex).toBeLessThan(4);
  });

  it("es DETERMINISTA: mismo orden de opciones para un mismo (i, fase)", () => {
    const i = classificationWineIndex();
    const a = getQuestion(i, "gamificacion");
    const b = getQuestion(i, "gamificacion");
    expect(a.options).toEqual(b.options);
    expect(a.correctIndex).toBe(b.correctIndex);
    expect(a.prompt).toBe(b.prompt);
  });
});

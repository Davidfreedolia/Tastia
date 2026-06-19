// Tests del banco de preguntas demo (§5.2). Cubren: determinismo de `getQuestion`
// (mismo enunciado, mismas opciones, mismo `correctIndex` y mismo orden para un `(i,f)`),
// la rotación de la pregunta de gamificación por `wineIndex`, y que la opción marcada como
// correcta corresponde de verdad a la nota de cata / ficha.
import { describe, expect, it } from "vitest";
import { FASES, isCorrect, type Fase } from "./session";
import { DEMO_WINES, getQuestion } from "./wines";

describe("getQuestion — determinismo (§5.2)", () => {
  it("misma Pregunta (enunciado + opciones + orden + correctIndex) para un mismo (i,f)", () => {
    for (let i = 0; i < DEMO_WINES.length; i++) {
      for (const fase of FASES) {
        const a = getQuestion(i, fase);
        const b = getQuestion(i, fase);
        expect(a).toEqual(b); // misma referencia de valor: incluye el orden de `options`
        expect(a.options).toEqual(b.options); // explícito: mismo orden exacto
        expect(a.correctIndex).toBe(b.correctIndex);
        expect(a.prompt).toBe(b.prompt);
      }
    }
  });

  it("siempre 4 opciones, todas distintas, con un correctIndex válido", () => {
    for (let i = 0; i < DEMO_WINES.length; i++) {
      for (const fase of FASES) {
        const q = getQuestion(i, fase);
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4); // sin duplicados
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(4);
      }
    }
  });

  it("la opción correcta coincide con la nota de cata (fases sensoriales)", () => {
    const sensorial: Fase[] = ["vista", "olfato", "gusto"];
    for (let i = 0; i < DEMO_WINES.length; i++) {
      for (const fase of sensorial) {
        const q = getQuestion(i, fase);
        expect(q.options[q.correctIndex]).toBe(DEMO_WINES[i].tasting[fase as "vista" | "olfato" | "gusto"]);
      }
    }
  });
});

describe("getQuestion — gamificación rota por wineIndex (§5.2)", () => {
  it("rota variedad → clasificación → precio según wineIndex % 3", () => {
    // wineIndex 0 → variedad (grape); 1 → clasificación; 2 → precio; 3 → variedad otra vez.
    expect(getQuestion(0, "gamificacion").options).toContain(DEMO_WINES[0].grape);
    expect(getQuestion(1, "gamificacion").options).toContain(DEMO_WINES[1].classification);
    expect(getQuestion(2, "gamificacion").options).toContain(DEMO_WINES[2].priceRange);
    expect(getQuestion(3, "gamificacion").options).toContain(DEMO_WINES[3].grape);
  });

  it("la opción correcta de gamificación es el valor de la ficha que toca", () => {
    const q0 = getQuestion(0, "gamificacion");
    expect(q0.options[q0.correctIndex]).toBe(DEMO_WINES[0].grape); // 0 → variedad
    const q1 = getQuestion(1, "gamificacion");
    expect(q1.options[q1.correctIndex]).toBe(DEMO_WINES[1].classification); // 1 → clasificación
    const q2 = getQuestion(2, "gamificacion");
    expect(q2.options[q2.correctIndex]).toBe(DEMO_WINES[2].priceRange); // 2 → precio
  });

  it("el enunciado depende del atributo que toca (no es genérico)", () => {
    const prompts = [0, 1, 2].map((i) => getQuestion(i, "gamificacion").prompt);
    expect(new Set(prompts).size).toBe(3); // tres enunciados distintos
  });
});

describe("isCorrect (§5.2)", () => {
  it("true solo para el correctIndex, false para el resto", () => {
    const q = getQuestion(0, "vista");
    expect(isCorrect(q.correctIndex, q)).toBe(true);
    for (let i = 0; i < q.options.length; i++) {
      if (i !== q.correctIndex) expect(isCorrect(i, q)).toBe(false);
    }
  });

  it("índice fuera de rango = false", () => {
    const q = getQuestion(1, "gusto");
    expect(isCorrect(-1, q)).toBe(false);
    expect(isCorrect(99, q)).toBe(false);
  });
});

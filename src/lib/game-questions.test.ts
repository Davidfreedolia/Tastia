// §5.8b — Tests de la lógica pura del banco de preguntas (`game_questions`).
// Cubre `validateQuestionForm` (válido, <2 opciones, correcta ∉ opciones, puntos ≤0/no
// entero, enunciado vacío) y los mapeos `questionInsertFromForm`/`questionFormFromRow`.
import { describe, expect, it } from "vitest";
import {
  hasQuestionErrors,
  questionFormFromRow,
  questionInsertFromForm,
  validateQuestionForm,
  type QuestionForm,
} from "./game-questions";
import type { Database } from "./database.types";

/** Forma base válida. */
const valid: QuestionForm = {
  wine_id: "wine-1",
  fase: "vista",
  type: "variedad",
  text_es: "¿Qué color tiene el vino?",
  text_en: "What colour is the wine?",
  options: ["Tinto", "Blanco", "Rosado"],
  correct_answer: "Tinto",
  points: 100,
  active: true,
};

describe("validateQuestionForm (§5.8b)", () => {
  it("forma válida → sin errores ({})", () => {
    expect(validateQuestionForm(valid)).toEqual({});
    expect(hasQuestionErrors(validateQuestionForm(valid))).toBe(false);
  });

  it("sin vino → error en wine_id", () => {
    const errs = validateQuestionForm({ ...valid, wine_id: "" });
    expect(errs.wine_id).toBeDefined();
  });

  it("enunciado vacío (solo espacios) → error en text_es", () => {
    const errs = validateQuestionForm({ ...valid, text_es: "   " });
    expect(errs.text_es).toBeDefined();
  });

  it("<2 opciones no vacías → error en options", () => {
    const errs = validateQuestionForm({ ...valid, options: ["Tinto", "  "], correct_answer: "Tinto" });
    expect(errs.options).toBeDefined();
  });

  it("correct_answer no ∈ opciones → error en correct_answer", () => {
    const errs = validateQuestionForm({ ...valid, correct_answer: "Espumoso" });
    expect(errs.correct_answer).toBeDefined();
  });

  it("correct_answer vacío → error en correct_answer", () => {
    const errs = validateQuestionForm({ ...valid, correct_answer: "" });
    expect(errs.correct_answer).toBeDefined();
  });

  it("correct_answer coincide tras trim → válido", () => {
    const errs = validateQuestionForm({ ...valid, correct_answer: "  Tinto  " });
    expect(errs.correct_answer).toBeUndefined();
  });

  it("points ≤ 0 → error en points", () => {
    const errs = validateQuestionForm({ ...valid, points: 0 });
    expect(errs.points).toBeDefined();
    expect(validateQuestionForm({ ...valid, points: -10 }).points).toBeDefined();
  });

  it("points no entero → error en points", () => {
    const errs = validateQuestionForm({ ...valid, points: 12.5 });
    expect(errs.points).toBeDefined();
  });

  it("points NaN → error en points", () => {
    const errs = validateQuestionForm({ ...valid, points: NaN });
    expect(errs.points).toBeDefined();
  });
});

describe("questionInsertFromForm (§5.8b)", () => {
  it("produce options string[] sin vacíos, correct_answer y points correctos", () => {
    const insert = questionInsertFromForm({
      ...valid,
      options: ["  Tinto ", "", "Blanco", "   "],
      correct_answer: "  Tinto ",
    });
    expect(insert.options).toEqual(["Tinto", "Blanco"]);
    expect(insert.correct_answer).toBe("Tinto");
    expect(insert.points).toBe(100);
    expect(insert.active).toBe(true);
    expect(insert.wine_id).toBe("wine-1");
    expect(insert.fase).toBe("vista");
  });

  it("text_en vacío → null; type '' → null", () => {
    const insert = questionInsertFromForm({ ...valid, text_en: "   ", type: "" });
    expect(insert.text_en).toBeNull();
    expect(insert.type).toBeNull();
  });

  it("text_es y text_en se recortan", () => {
    const insert = questionInsertFromForm({
      ...valid,
      text_es: "  Hola  ",
      text_en: "  Hi  ",
    });
    expect(insert.text_es).toBe("Hola");
    expect(insert.text_en).toBe("Hi");
  });
});

describe("questionFormFromRow (§5.8b)", () => {
  type QuestionRow = Database["public"]["Tables"]["game_questions"]["Row"];

  const row: QuestionRow = {
    active: true,
    correct_answer: "Tinto",
    created_at: "2026-06-21T00:00:00Z",
    fase: "vista",
    id: "q-1",
    options: ["Tinto", "Blanco", "Rosado"],
    points: 100,
    text_en: "What colour?",
    text_es: "¿Qué color?",
    type: "variedad",
    updated_at: "2026-06-21T00:00:00Z",
    wine_id: "wine-1",
  };

  it("mapea una fila a form (round-trip básico)", () => {
    const form = questionFormFromRow(row);
    expect(form).toEqual({
      wine_id: "wine-1",
      fase: "vista",
      type: "variedad",
      text_es: "¿Qué color?",
      text_en: "What colour?",
      options: ["Tinto", "Blanco", "Rosado"],
      correct_answer: "Tinto",
      points: 100,
      active: true,
    });
    // El form resultante es válido y reconstruye el mismo Insert canónico.
    expect(validateQuestionForm(form)).toEqual({});
    const insert = questionInsertFromForm(form);
    expect(insert.options).toEqual(["Tinto", "Blanco", "Rosado"]);
    expect(insert.correct_answer).toBe("Tinto");
  });

  it("null/vacíos → type '' , text_en '' , options []", () => {
    const form = questionFormFromRow({
      ...row,
      type: null,
      text_en: null,
      correct_answer: null,
      options: null,
      wine_id: null,
    });
    expect(form.type).toBe("");
    expect(form.text_en).toBe("");
    expect(form.correct_answer).toBe("");
    expect(form.options).toEqual([]);
    expect(form.wine_id).toBe("");
  });

  it("options no-array (objeto Json) → [] de forma segura", () => {
    const form = questionFormFromRow({ ...row, options: { a: 1 } });
    expect(form.options).toEqual([]);
  });
});

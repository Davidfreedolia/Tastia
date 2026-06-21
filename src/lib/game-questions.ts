// §5.8b — Lógica PURA del banco de preguntas (`game_questions`): sin I/O, sin React.
// Define los enums de fase/tipo, el tipo del formulario, la validación por campo y los
// mapeos form↔fila para alta/edición.
//
// Contrato con el juego (`quiz-source.ts`): `options` se guarda como `string[]` y
// `correct_answer` es EXACTAMENTE una de esas opciones (el índice lo resuelve `quiz-close`).
// Por eso la validación exige que `correct_answer` coincida (===, tras trim) con una opción.

import type { Database } from "./database.types";

/** Fases del juego (enum `question_fase` de la BD). */
export const QUESTION_FASES = ["vista", "olfato", "gusto", "gamificacion"] as const;

/** Tipos de pregunta (enum `question_type` de la BD). */
export const QUESTION_TYPES = [
  "variedad",
  "denominacion",
  "precio",
  "anada",
  "trivia",
  "clasificacion",
] as const;

export type QuestionFase = (typeof QUESTION_FASES)[number];
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Fila de `game_questions` tal como la devuelve Supabase. */
type QuestionRow = Database["public"]["Tables"]["game_questions"]["Row"];
/** Insert de `game_questions` (lo que escribimos al guardar). */
type QuestionInsert = Database["public"]["Tables"]["game_questions"]["Insert"];

/**
 * Campos EDITABLES de una pregunta. `type: ""` = sin tipo (se mapea a null al guardar);
 * `options` es la lista cruda de inputs (puede traer vacíos que se recortan al guardar).
 */
export type QuestionForm = {
  wine_id: string;
  fase: QuestionFase;
  type: QuestionType | "";
  text_es: string;
  text_en: string;
  options: string[];
  correct_answer: string;
  points: number;
  active: boolean;
};

/** ¿Es un entero finito > 0? (rechaza NaN, Infinity, decimales y ≤0). */
function isPositiveInteger(n: number): boolean {
  return Number.isInteger(n) && n > 0;
}

/**
 * Valida un formulario de pregunta y devuelve los errores POR CAMPO (en español).
 * Sin errores → `{}`. No hace I/O; el llamador decide bloquear "Guardar".
 *
 * Reglas:
 *  - `wine_id`: requerido.
 *  - `text_es`: no vacío (tras trim).
 *  - `options`: al menos 2 opciones no vacías (tras trim).
 *  - `correct_answer`: no vacío y === (tras trim) a una de las opciones no vacías.
 *  - `points`: entero finito > 0.
 */
export function validateQuestionForm(
  form: QuestionForm,
): Partial<Record<keyof QuestionForm, string>> {
  const errors: Partial<Record<keyof QuestionForm, string>> = {};

  if (!form.wine_id) {
    errors.wine_id = "Selecciona un vino.";
  }

  if (form.text_es.trim() === "") {
    errors.text_es = "El enunciado es obligatorio.";
  }

  const cleanOptions = form.options.map((o) => o.trim()).filter(Boolean);
  if (cleanOptions.length < 2) {
    errors.options = "Añade al menos 2 opciones.";
  }

  const answer = form.correct_answer.trim();
  if (answer === "") {
    errors.correct_answer = "Marca la opción correcta.";
  } else if (!cleanOptions.includes(answer)) {
    errors.correct_answer = "La respuesta correcta debe coincidir con una de las opciones.";
  }

  if (!isPositiveInteger(form.points)) {
    errors.points = "Los puntos deben ser un entero mayor que 0.";
  }

  return errors;
}

/** ¿El objeto de errores tiene al menos un error? */
export function hasQuestionErrors(errs: Partial<Record<keyof QuestionForm, string>>): boolean {
  return Object.keys(errs).length > 0;
}

/**
 * Convierte un formulario validado en el Insert de `game_questions`.
 * - `options`: recorta y descarta vacíos → `string[]` (Json).
 * - `correct_answer`: recortado (debe estar entre `options`).
 * - `text_es`: recortado; `text_en`: recortado → null si vacío.
 * - `type`: "" → null.
 */
export function questionInsertFromForm(form: QuestionForm): QuestionInsert {
  const options = form.options.map((o) => o.trim()).filter(Boolean);
  const textEn = form.text_en.trim();
  return {
    wine_id: form.wine_id,
    fase: form.fase,
    type: form.type === "" ? null : form.type,
    text_es: form.text_es.trim(),
    text_en: textEn === "" ? null : textEn,
    options,
    correct_answer: form.correct_answer.trim(),
    points: form.points,
    active: form.active,
  };
}

/**
 * Mapea una fila de `game_questions` a un `QuestionForm` para EDITAR.
 * - `options`: parsea el Json de forma segura a `string[]`.
 * - `type` null → ""; `text_en` null → ""; `correct_answer` null → "".
 */
export function questionFormFromRow(row: QuestionRow): QuestionForm {
  return {
    wine_id: row.wine_id ?? "",
    fase: row.fase,
    type: row.type ?? "",
    text_es: row.text_es,
    text_en: row.text_en ?? "",
    options: Array.isArray(row.options) ? row.options.map(String) : [],
    correct_answer: row.correct_answer ?? "",
    points: row.points,
    active: row.active,
  };
}

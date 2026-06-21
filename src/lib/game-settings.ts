// §5.8a — Lógica PURA del editor de `game_settings` (sin I/O, sin React).
// Define los rangos válidos, el tipo del formulario, la validación por campo y
// un helper para prefiltrar un tier sin fila desde la fila GLOBAL.
//
// NO cambia el runtime del juego (sigue con hardcoded en `session.ts` hasta §5.6b):
// aquí solo se preparan/validan los valores que editará el admin.

import type { Database } from "./database.types";

/** Gamas de precio de la BD (enum `price_band`); `null` = fila GLOBAL. */
export type PriceBand = Database["public"]["Enums"]["price_band"];

/** Rangos permitidos para cada campo editable (cliente-side, antes de escribir). */
export const SETTINGS_LIMITS = {
  timeMin: 5,
  timeMax: 300,
  pointsMin: 0,
  pointsMax: 1000,
  bonusMin: 0,
  bonusMax: 1000,
} as const;

/** Campos EDITABLES de `game_settings` (no se exponen `active`/`ranking_period`). */
export type SettingsForm = {
  time_vista_s: number;
  time_olfato_s: number;
  time_gusto_s: number;
  time_gamificacion_s: number;
  points_base: number;
  bonus_max: number;
};

/** Los 4 bloques del editor, en orden: Global + las 3 gamas. `key: null` = global. */
export const GAME_TIERS: ReadonlyArray<{ key: PriceBand | null; label: string }> = [
  { key: null, label: "Global" },
  { key: "basico", label: "Básico" },
  { key: "normal", label: "Normal" },
  { key: "premium", label: "Premium" },
];

/** Los 4 campos de tiempo (segundos por fase). */
const TIME_FIELDS: ReadonlyArray<keyof SettingsForm> = [
  "time_vista_s",
  "time_olfato_s",
  "time_gusto_s",
  "time_gamificacion_s",
];

/** ¿Es un entero finito? (rechaza NaN, Infinity y decimales como 12.5). */
function isInteger(n: number): boolean {
  return Number.isInteger(n);
}

/**
 * Valida un formulario de ajustes y devuelve los errores POR CAMPO (en español).
 * Sin errores → `{}`. No hace I/O; el llamador decide bloquear "Guardar".
 *
 * Reglas:
 *  - cada `time_*_s`: entero en [5, 300].
 *  - `points_base`: entero en [0, 1000].
 *  - `bonus_max`: entero en [0, 1000].
 * Valores vacíos/NaN se reportan como "debe ser un número entero".
 */
export function validateGameSettings(
  form: SettingsForm,
): Partial<Record<keyof SettingsForm, string>> {
  const errors: Partial<Record<keyof SettingsForm, string>> = {};
  const { timeMin, timeMax, pointsMin, pointsMax, bonusMin, bonusMax } = SETTINGS_LIMITS;

  for (const field of TIME_FIELDS) {
    const v = form[field];
    if (!isInteger(v)) {
      errors[field] = "Debe ser un número entero.";
    } else if (v < timeMin || v > timeMax) {
      errors[field] = `Debe estar entre ${timeMin} y ${timeMax} segundos.`;
    }
  }

  if (!isInteger(form.points_base)) {
    errors.points_base = "Debe ser un número entero.";
  } else if (form.points_base < pointsMin || form.points_base > pointsMax) {
    errors.points_base = `Debe estar entre ${pointsMin} y ${pointsMax}.`;
  }

  if (!isInteger(form.bonus_max)) {
    errors.bonus_max = "Debe ser un número entero.";
  } else if (form.bonus_max < bonusMin || form.bonus_max > bonusMax) {
    errors.bonus_max = `Debe estar entre ${bonusMin} y ${bonusMax}.`;
  }

  return errors;
}

/** ¿El objeto de errores tiene al menos un error? */
export function hasErrors(errs: Partial<Record<keyof SettingsForm, string>>): boolean {
  return Object.keys(errs).length > 0;
}

/**
 * Copia los valores de la fila GLOBAL para prefiltrar un tier que aún no tiene fila.
 * Al guardar ese tier se creará por `upsert` sobre `pack_tier`.
 */
export function defaultsFromGlobal(global: SettingsForm): SettingsForm {
  return {
    time_vista_s: global.time_vista_s,
    time_olfato_s: global.time_olfato_s,
    time_gusto_s: global.time_gusto_s,
    time_gamificacion_s: global.time_gamificacion_s,
    points_base: global.points_base,
    bonus_max: global.bonus_max,
  };
}

// §5.8a — Tests de la lógica pura del editor de `game_settings`.
// Cubre `validateGameSettings` (válidos, límites exactos, fuera de rango, no-entero,
// vacío/NaN) y `defaultsFromGlobal`.
import { describe, expect, it } from "vitest";
import {
  defaultsFromGlobal,
  hasErrors,
  SETTINGS_LIMITS,
  validateGameSettings,
  type SettingsForm,
} from "./game-settings";

/** Forma base válida (valores de referencia de `session.ts`). */
const valid: SettingsForm = {
  time_vista_s: 30,
  time_olfato_s: 30,
  time_gusto_s: 45,
  time_gamificacion_s: 30,
  points_base: 100,
  bonus_max: 50,
};

describe("validateGameSettings (§5.8a)", () => {
  it("forma válida → sin errores ({})", () => {
    expect(validateGameSettings(valid)).toEqual({});
    expect(hasErrors(validateGameSettings(valid))).toBe(false);
  });

  it("límites exactos (5, 300, 0, 1000) → válidos", () => {
    expect(
      validateGameSettings({
        time_vista_s: SETTINGS_LIMITS.timeMin, // 5
        time_olfato_s: SETTINGS_LIMITS.timeMax, // 300
        time_gusto_s: SETTINGS_LIMITS.timeMin, // 5
        time_gamificacion_s: SETTINGS_LIMITS.timeMax, // 300
        points_base: SETTINGS_LIMITS.pointsMin, // 0
        bonus_max: SETTINGS_LIMITS.bonusMax, // 1000
      }),
    ).toEqual({});

    expect(
      validateGameSettings({
        ...valid,
        points_base: SETTINGS_LIMITS.pointsMax, // 1000
        bonus_max: SETTINGS_LIMITS.bonusMin, // 0
      }),
    ).toEqual({});
  });

  it("time < 5 → error en ese campo", () => {
    const errs = validateGameSettings({ ...valid, time_vista_s: 4 });
    expect(errs.time_vista_s).toBeDefined();
    // los demás campos siguen válidos
    expect(errs.time_olfato_s).toBeUndefined();
  });

  it("time > 300 → error en ese campo", () => {
    const errs = validateGameSettings({ ...valid, time_gusto_s: 301 });
    expect(errs.time_gusto_s).toBeDefined();
  });

  it("time no entero (12.5) → error en ese campo", () => {
    const errs = validateGameSettings({ ...valid, time_olfato_s: 12.5 });
    expect(errs.time_olfato_s).toBeDefined();
  });

  it("time vacío/NaN → error en ese campo", () => {
    const errs = validateGameSettings({ ...valid, time_gamificacion_s: NaN });
    expect(errs.time_gamificacion_s).toBeDefined();
  });

  it("points_base negativo → error", () => {
    const errs = validateGameSettings({ ...valid, points_base: -1 });
    expect(errs.points_base).toBeDefined();
  });

  it("points_base > 1000 → error", () => {
    const errs = validateGameSettings({ ...valid, points_base: 1001 });
    expect(errs.points_base).toBeDefined();
  });

  it("points_base no entero → error", () => {
    const errs = validateGameSettings({ ...valid, points_base: 10.5 });
    expect(errs.points_base).toBeDefined();
  });

  it("bonus_max negativo → error", () => {
    const errs = validateGameSettings({ ...valid, bonus_max: -5 });
    expect(errs.bonus_max).toBeDefined();
  });

  it("bonus_max > 1000 → error", () => {
    const errs = validateGameSettings({ ...valid, bonus_max: 1001 });
    expect(errs.bonus_max).toBeDefined();
  });

  it("varios campos inválidos → varios errores, hasErrors true", () => {
    const errs = validateGameSettings({
      ...valid,
      time_vista_s: 0,
      points_base: -1,
      bonus_max: 99999,
    });
    expect(Object.keys(errs).sort()).toEqual(["bonus_max", "points_base", "time_vista_s"]);
    expect(hasErrors(errs)).toBe(true);
  });
});

describe("defaultsFromGlobal (§5.8a)", () => {
  it("copia los 6 campos editables de la global", () => {
    const global: SettingsForm = {
      time_vista_s: 20,
      time_olfato_s: 25,
      time_gusto_s: 35,
      time_gamificacion_s: 40,
      points_base: 200,
      bonus_max: 60,
    };
    expect(defaultsFromGlobal(global)).toEqual(global);
  });

  it("devuelve un objeto NUEVO (no la misma referencia)", () => {
    const copy = defaultsFromGlobal(valid);
    expect(copy).not.toBe(valid);
    expect(copy).toEqual(valid);
  });
});

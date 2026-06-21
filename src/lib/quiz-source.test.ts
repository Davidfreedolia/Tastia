// §5.6b-A — Tests de la capa `quiz-source.ts`. Cubren:
//  - `secondsFor`: mapea cada fase a su `time_<fase>_s`.
//  - `demoQuizSource`: `questionFor`/`closeQuiz` coinciden EXACTAMENTE con `getQuestion`/
//    `computeAwards` (motor demo reutilizado, no duplicado) y con `FASE_SECONDS`/`BASE`/`BONUS_MAX`.
//  - `loadQuizSource`: cae a `source:"demo"` si Supabase no está configurado (`getSupabase()===null`)
//    o si el invoke de `quiz-bootstrap` lanza/da error; usa la BD (`source:"bd"`) si responde.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BASE,
  BONUS_MAX,
  computeAwards,
  FASE_SECONDS,
  FASES,
  type Fase,
} from "./session";
import { DEMO_WINES, getQuestion } from "./wines";

// El módulo de Supabase se mockea por test (getSupabase devuelve null o un cliente fake con
// `functions.invoke`), porque el real trae literales públicos hardcoded y nunca devuelve null.
vi.mock("./supabase", () => ({
  supabaseConfigured: true,
  getSupabase: vi.fn(),
}));

import { getSupabase } from "./supabase";
import {
  demoQuizSource,
  loadQuizSource,
  secondsFor,
  type QuizSettings,
} from "./quiz-source";

const mockedGetSupabase = vi.mocked(getSupabase);

afterEach(() => {
  vi.clearAllMocks();
});

const DEMO_SETTINGS: QuizSettings = {
  time_vista_s: FASE_SECONDS.vista,
  time_olfato_s: FASE_SECONDS.olfato,
  time_gusto_s: FASE_SECONDS.gusto,
  time_gamificacion_s: FASE_SECONDS.gamificacion,
  points_base: BASE,
  bonus_max: BONUS_MAX,
};

describe("secondsFor — fase → time_<fase>_s", () => {
  it("mapea cada fase a su campo de settings", () => {
    const s: QuizSettings = {
      time_vista_s: 11,
      time_olfato_s: 22,
      time_gusto_s: 33,
      time_gamificacion_s: 44,
      points_base: 100,
      bonus_max: 50,
    };
    expect(secondsFor(s, "vista")).toBe(11);
    expect(secondsFor(s, "olfato")).toBe(22);
    expect(secondsFor(s, "gusto")).toBe(33);
    expect(secondsFor(s, "gamificacion")).toBe(44);
  });
});

describe("demoQuizSource — reutiliza el motor demo (getQuestion/computeAwards)", () => {
  it("source = 'demo' y settings = constantes (FASE_SECONDS/BASE/BONUS_MAX)", () => {
    const src = demoQuizSource();
    expect(src.source).toBe("demo");
    expect(src.settings).toEqual(DEMO_SETTINGS);
  });

  it("secondsFor(settings, fase) coincide con FASE_SECONDS", () => {
    const src = demoQuizSource();
    for (const fase of FASES) {
      expect(secondsFor(src.settings, fase)).toBe(FASE_SECONDS[fase]);
    }
  });

  it("questionFor(i,fase) = {prompt,options} de getQuestion (SIN correctIndex)", () => {
    const src = demoQuizSource();
    for (let i = 0; i < DEMO_WINES.length; i++) {
      for (const fase of FASES) {
        const q = getQuestion(i, fase);
        const aq = src.questionFor(i, fase);
        expect(aq).toEqual({ prompt: q.prompt, options: q.options });
        // anti-spoiler: la pregunta activa no expone la respuesta.
        expect("correctIndex" in (aq as object)).toBe(false);
      }
    }
  });

  it("closeQuiz coincide con computeAwards + correctIndex de getQuestion (+ revealedWine)", async () => {
    const src = demoQuizSource();
    const answers: Record<string, { optionIndex: number; seq: number }> = {};
    // Construye respuestas: el 1.º acierta, el 2.º falla — usando la pregunta de (0, vista).
    const fase: Fase = "vista";
    const q = getQuestion(0, fase);
    const wrong = (q.correctIndex + 1) % q.options.length;
    answers.a = { optionIndex: q.correctIndex, seq: 0 };
    answers.b = { optionIndex: wrong, seq: 1 };

    const r = await src.closeQuiz(0, fase, answers);
    expect(r.correctOptionIndex).toBe(q.correctIndex);
    expect(r.correctLabel).toBe(q.options[q.correctIndex]);
    expect(r.awards).toEqual(computeAwards(answers, q));
    expect(r.revealedWine).toEqual(DEMO_WINES[0]);
  });

  it("closeQuiz cubre todas las (i,fase) igual que computeAwards", async () => {
    const src = demoQuizSource();
    for (let i = 0; i < DEMO_WINES.length; i++) {
      for (const fase of FASES) {
        const q = getQuestion(i, fase);
        const answers = { a: { optionIndex: q.correctIndex, seq: 0 } };
        const r = await src.closeQuiz(i, fase, answers);
        expect(r.correctOptionIndex).toBe(q.correctIndex);
        expect(r.correctLabel).toBe(q.options[q.correctIndex]);
        expect(r.awards).toEqual(computeAwards(answers, q));
      }
    }
  });
});

describe("loadQuizSource — fallback a demo / uso de la BD", () => {
  it("Supabase no configurado (getSupabase() === null) → source 'demo'", async () => {
    mockedGetSupabase.mockReturnValue(null);
    const src = await loadQuizSource("TEST");
    expect(src.source).toBe("demo");
    expect(src.settings).toEqual(DEMO_SETTINGS);
  });

  it("quiz-bootstrap lanza (invoke rechaza) → source 'demo'", async () => {
    mockedGetSupabase.mockReturnValue({
      functions: { invoke: vi.fn().mockRejectedValue(new Error("boom")) },
    } as never);
    const src = await loadQuizSource("TEST");
    expect(src.source).toBe("demo");
  });

  it("quiz-bootstrap devuelve {error} → source 'demo'", async () => {
    mockedGetSupabase.mockReturnValue({
      functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: new Error("nope") }) },
    } as never);
    const src = await loadQuizSource("TEST");
    expect(src.source).toBe("demo");
  });

  it("quiz-bootstrap OK → source 'bd', settings y preguntas de la BD (sin respuesta)", async () => {
    const settings: QuizSettings = {
      time_vista_s: 12,
      time_olfato_s: 12,
      time_gusto_s: 18,
      time_gamificacion_s: 12,
      points_base: 200,
      bonus_max: 80,
    };
    const invoke = vi.fn().mockResolvedValue({
      data: {
        settings,
        questions: [
          { wineIndex: 0, fase: "vista", prompt: "¿BD vista?", options: ["w", "x", "y", "z"] },
        ],
      },
      error: null,
    });
    mockedGetSupabase.mockReturnValue({ functions: { invoke } } as never);

    const src = await loadQuizSource("TEST");
    expect(src.source).toBe("bd");
    expect(src.settings).toEqual(settings);
    expect(secondsFor(src.settings, "gusto")).toBe(18); // tiempo desde la BD
    // Pregunta presente en la BD: se sirve tal cual.
    expect(src.questionFor(0, "vista")).toEqual({ prompt: "¿BD vista?", options: ["w", "x", "y", "z"] });
    // Pregunta ausente en la BD: NO se mezcla con demo → "Pregunta no disponible" (sin opciones).
    expect(src.questionFor(1, "olfato")).toEqual({ prompt: "Pregunta no disponible", options: [] });
  });

  it("modo BD: closeQuiz invoca quiz-close y mapea a CloseResult", async () => {
    const invoke = vi
      .fn()
      // 1.ª llamada: quiz-bootstrap
      .mockResolvedValueOnce({
        data: {
          settings: DEMO_SETTINGS,
          questions: [{ wineIndex: 0, fase: "vista", prompt: "q", options: ["a", "b", "c", "d"] }],
        },
        error: null,
      })
      // 2.ª llamada: quiz-close
      .mockResolvedValueOnce({
        data: { correctOptionIndex: 2, correctLabel: "Correcta", awards: { a: 150 }, revealedWine: { name: "X" } },
        error: null,
      });
    mockedGetSupabase.mockReturnValue({ functions: { invoke } } as never);

    const src = await loadQuizSource("TEST");
    const r = await src.closeQuiz(0, "vista", { a: { optionIndex: 2, seq: 0 } });
    expect(r).toEqual({
      correctOptionIndex: 2,
      correctLabel: "Correcta",
      awards: { a: 150 },
      revealedWine: { name: "X" },
    });
    // quiz-close se llamó con el body del contrato.
    expect(invoke).toHaveBeenLastCalledWith("quiz-close", {
      body: { code: "TEST", wineIndex: 0, fase: "vista", answers: { a: { optionIndex: 2, seq: 0 } } },
    });
  });

  it("modo BD: si quiz-close da error, closeQuiz LANZA (el hook hará el fallback por-cierre)", async () => {
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          settings: DEMO_SETTINGS,
          questions: [{ wineIndex: 0, fase: "vista", prompt: "q", options: ["a", "b", "c", "d"] }],
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: new Error("close failed") });
    mockedGetSupabase.mockReturnValue({ functions: { invoke } } as never);

    const src = await loadQuizSource("TEST");
    await expect(src.closeQuiz(0, "vista", {})).rejects.toThrow();
  });

  it("settings inválidos (falta un tiempo) → source 'demo' (evita NaN en el deadline)", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        // falta time_gusto_s → settings inválidos
        settings: { time_vista_s: 30, time_olfato_s: 30, time_gamificacion_s: 30, points_base: 100, bonus_max: 50 },
        questions: [{ wineIndex: 0, fase: "vista", prompt: "q", options: ["a", "b", "c", "d"] }],
      },
      error: null,
    });
    mockedGetSupabase.mockReturnValue({ functions: { invoke } } as never);
    const src = await loadQuizSource("TEST");
    expect(src.source).toBe("demo");
  });

  it("sin preguntas (questions vacías) → source 'demo' (todo-o-nada, no mezcla)", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { settings: DEMO_SETTINGS, questions: [] },
      error: null,
    });
    mockedGetSupabase.mockReturnValue({ functions: { invoke } } as never);
    const src = await loadQuizSource("TEST");
    expect(src.source).toBe("demo");
  });
});

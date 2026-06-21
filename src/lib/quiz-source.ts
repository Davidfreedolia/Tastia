// §5.6b-A — Capa que ABSTRAE de dónde salen el quiz y el reveal: de la BD (edge functions
// de Salvador: `quiz-bootstrap` + `quiz-close`) o del modo DEMO (constantes/`DEMO_WINES`/
// `getQuestion`/`computeAwards` ya existentes). Sin React: la consume el hook host-autoritario
// (`use-room-channel.ts`), que difunde la pregunta activa y el reveal en `RoomState`.
//
// Anti-spoiler (opción B): `questionFor` devuelve SOLO `{ prompt, options }` (sin la respuesta);
// la respuesta correcta llega únicamente en el cierre (`closeQuiz` → `CloseResult`). En modo BD
// vive en la edge function (service_role); en demo se deriva localmente de `getQuestion`.
//
// Diseño BD = fuente de verdad + FALLBACK total a demo: si `quiz-bootstrap` falla/timeout o
// Supabase no está configurado, `loadQuizSource` devuelve `demoQuizSource()` (juego plenamente
// funcional sin deploy). Si `quiz-close` falla a mitad de partida, LANZA y el hook hace el
// fallback por-cierre (puntúa en local y marca `source="demo"` para el badge).

import { getSupabase } from "./supabase";
import {
  BASE,
  BONUS_MAX,
  computeAwards,
  FASE_SECONDS,
  type Fase,
} from "./session";
import { DEMO_WINES, getQuestion } from "./wines";

/** Ajustes del juego (tiempos/puntos). En BD = `game_settings` (§5.8); en demo = constantes. */
export type QuizSettings = {
  time_vista_s: number;
  time_olfato_s: number;
  time_gusto_s: number;
  time_gamificacion_s: number;
  points_base: number;
  bonus_max: number;
};

/** Resultado del cierre de una Pregunta (reveal + reparto). `revealedWine` solo en la última fase. */
export type CloseResult = {
  correctOptionIndex: number;
  correctLabel: string;
  awards: Record<string, number>;
  revealedWine?: unknown;
};

/**
 * Fuente del quiz (BD o demo). El host fija la pregunta activa con `questionFor` (sin respuesta)
 * y cierra con `closeQuiz` (que trae el reveal + reparto). `source` alimenta el badge "Datos demo".
 */
export type QuizSource = {
  source: "bd" | "demo";
  settings: QuizSettings;
  /** Enunciado + opciones de `(wineIndex, fase)`. SIN `correctIndex` (anti-spoiler). */
  questionFor(wineIndex: number, fase: Fase): { prompt: string; options: string[] };
  /** Cierra la Pregunta: puntúa y revela. En BD invoca `quiz-close` (LANZA si falla). */
  closeQuiz(
    wineIndex: number,
    fase: Fase,
    answers: Record<string, { optionIndex: number; seq: number }>,
  ): Promise<CloseResult>;
};

/** Mapea una `Fase` al campo `time_<fase>_s` de los settings (segundos del quiz de esa fase). */
export function secondsFor(s: QuizSettings, fase: Fase): number {
  switch (fase) {
    case "vista":
      return s.time_vista_s;
    case "olfato":
      return s.time_olfato_s;
    case "gusto":
      return s.time_gusto_s;
    case "gamificacion":
      return s.time_gamificacion_s;
  }
}

/** Settings derivados de las constantes del modo demo (§5.3/§5.5). */
function demoSettings(): QuizSettings {
  return {
    time_vista_s: FASE_SECONDS.vista,
    time_olfato_s: FASE_SECONDS.olfato,
    time_gusto_s: FASE_SECONDS.gusto,
    time_gamificacion_s: FASE_SECONDS.gamificacion,
    points_base: BASE,
    bonus_max: BONUS_MAX,
  };
}

/**
 * Fuente DEMO: SÍNCRONA por construcción (envuelve `getQuestion`/`computeAwards`/`FASE_SECONDS`/
 * `BASE`/`DEMO_WINES`). `closeQuiz` devuelve una Promise resuelta para cumplir el contrato async.
 * Reusa el motor existente (no lo duplica): mismo reparto y misma respuesta correcta.
 */
export function demoQuizSource(): QuizSource {
  return {
    source: "demo",
    settings: demoSettings(),
    questionFor(wineIndex, fase) {
      const q = getQuestion(wineIndex, fase);
      return { prompt: q.prompt, options: q.options };
    },
    closeQuiz(wineIndex, fase, answers) {
      const q = getQuestion(wineIndex, fase);
      const awards = computeAwards(answers, q);
      return Promise.resolve({
        correctOptionIndex: q.correctIndex,
        correctLabel: q.options[q.correctIndex]!,
        awards,
        revealedWine: DEMO_WINES[wineIndex],
      });
    },
  };
}

/** Forma esperada del payload de `quiz-bootstrap` (anti-spoiler: las preguntas SIN respuesta). */
type BootstrapPayload = {
  settings: QuizSettings;
  questions: { wineIndex: number; fase: Fase; prompt: string; options: string[] }[];
};

/** Forma esperada del payload de `quiz-close` (reveal + reparto ya calculado por la function). */
type ClosePayload = {
  correctOptionIndex: number;
  correctLabel: string;
  awards: Record<string, number>;
  revealedWine?: unknown;
};

/** ¿Los settings traen los 4 tiempos como números finitos > 0? (si no, el `deadline` sería NaN). */
function isValidSettings(s: QuizSettings | undefined): s is QuizSettings {
  if (!s) return false;
  return [s.time_vista_s, s.time_olfato_s, s.time_gusto_s, s.time_gamificacion_s].every(
    (n) => typeof n === "number" && Number.isFinite(n) && n > 0,
  );
}

/**
 * Construye la fuente del juego para una sala. Intenta la BD (`quiz-bootstrap`); si Supabase no
 * está configurado, el invoke da error o el payload no es válido, cae a `demoQuizSource()`.
 *
 * En modo BD:
 *  - `questionFor(i,fase)` busca en `questions[]` por `(wineIndex,fase)` → `{ prompt, options }`;
 *    si falta esa pregunta, respalda con `getQuestion(i,fase)` de demo (esa pregunta concreta).
 *  - `closeQuiz` invoca `quiz-close`; si da error LANZA (el hook hace el fallback por-cierre).
 */
export async function loadQuizSource(code: string): Promise<QuizSource> {
  const sb = getSupabase();
  if (!sb) return demoQuizSource();

  try {
    const { data, error } = await sb.functions.invoke("quiz-bootstrap", { body: { code } });
    if (error || !data) return demoQuizSource();

    const payload = data as BootstrapPayload;
    const settings = payload.settings;
    const questions = Array.isArray(payload.questions) ? payload.questions : [];
    // El fallback a demo es a nivel de CARGA, TODO-o-NADA: si los settings no son válidos (evita
    // NaN en el deadline) o no hay preguntas, cae a demo COMPLETA. NUNCA se mezcla BD con demo en
    // la misma pregunta (serviría una pregunta y puntuaría otra → opción correcta y puntos erróneos).
    if (!isValidSettings(settings) || questions.length === 0) return demoQuizSource();

    return {
      source: "bd",
      settings,
      questionFor(wineIndex, fase) {
        const found = questions.find((q) => q.wineIndex === wineIndex && q.fase === fase);
        if (found && Array.isArray(found.options) && found.options.length > 0) {
          return { prompt: found.prompt, options: found.options };
        }
        // SIN respaldo a demo (mezclaría pregunta BD con scoring BD de otra): no disponible.
        return { prompt: "Pregunta no disponible", options: [] };
      },
      async closeQuiz(wineIndex, fase, answers) {
        const { data: closeData, error: closeError } = await sb.functions.invoke("quiz-close", {
          body: { code, wineIndex, fase, answers },
        });
        if (closeError || !closeData) {
          // LANZA: el hook captura y hace el fallback por-cierre (puntúa local + source="demo").
          throw closeError ?? new Error("quiz-close devolvió un payload vacío");
        }
        const r = closeData as ClosePayload;
        return {
          correctOptionIndex: r.correctOptionIndex,
          correctLabel: r.correctLabel,
          awards: r.awards ?? {},
          revealedWine: r.revealedWine,
        };
      },
    };
  } catch {
    return demoQuizSource();
  }
}

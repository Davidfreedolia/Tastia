// Contrato de la sesión de cata en vivo. Sincronizado por Supabase Realtime
// en el canal `room:{code}`. Ver docs/ARCHITECTURE.md.
//
// Máquina de estados (§5.1):
//   lobby → (por vino N: [vista, olfato, gusto, gamificacion] cada una {quiz → reveal}
//            → wine_podium) ×4 → final_podium
// El quiz real (§5.2), el temporizador (§5.3) y el reparto de puntos (§5.5) se acoplan
// a este contrato más adelante; aquí solo la estructura/máquina de estados.

/** Etapa global de la sesión. */
export type Stage =
  | "lobby" // sala de espera, los jugadores se unen
  | "playing" // catando un vino (avanza por fases y subestados)
  | "wine_podium" // podio parcial: ranking acumulado tras cerrar el vino N
  | "final_podium"; // podio final tras el último vino

/** Fase sensorial dentro de un vino (orden fijo en `FASES`). */
export type Fase =
  | "vista" // examen visual
  | "olfato" // examen olfativo
  | "gusto" // examen gustativo
  | "gamificacion"; // ronda de gamificación / quiniela

/** Subestado dentro de una fase: la pregunta y su revelación. */
export type Step =
  | "quiz" // se plantea la pregunta de la fase
  | "reveal"; // el avatar revela la respuesta de esa pregunta

/** Orden autoritativo de las fases dentro de cada vino. */
export const FASES: readonly Fase[] = ["vista", "olfato", "gusto", "gamificacion"];

export const WINE_COUNT = 4;

export const STAGE_LABEL: Record<Stage, string> = {
  lobby: "Sala de espera",
  playing: "En juego",
  wine_podium: "Podio parcial",
  final_podium: "Podio final",
};

export const FASE_LABEL: Record<Fase, string> = {
  vista: "Vista",
  olfato: "Olfato",
  gusto: "Gusto",
  gamificacion: "Gamificación",
};

export const STEP_LABEL: Record<Step, string> = {
  quiz: "Pregunta",
  reveal: "Revelación",
};

export type Participant = {
  id: string;
  name: string;
  isHost: boolean;
  /** Espectador de solo lectura (vista cinemática `/tv/$code`): no juega, no puntúa.
   *  Tracked en presence para que el host re-difunda estado al conectarse. */
  isViewer?: boolean;
  score: number;
  /** Foto en vivo opcional (§5.11): data-URL reducido (~128px JPEG) que viaja en la
   *  metadata de presence. Si no hay foto, la Sala pinta el avatar de iniciales. */
  photo?: string;
};

/**
 * §5.6b-A — Pregunta activa que el HOST fija en `RoomState` y difunde por Realtime.
 * Solo enunciado + opciones (NUNCA la respuesta correcta): el jugador es un renderizador
 * puro y no debe poder deducir el acierto antes del reveal (anti-spoiler, opción B).
 */
export type ActiveQuestion = { prompt: string; options: string[] };

/**
 * §5.6b-A — Reveal que el HOST fija al CERRAR la Pregunta (de `quiz-close` en modo BD o
 * de `getQuestion`/`DEMO_WINES` en modo demo) y difunde. `correctOptionIndex` apunta a la
 * opción correcta dentro de `ActiveQuestion.options`; `revealedWine` (ficha completa) solo
 * llega en la última fase del vino para el podio del vino.
 */
export type RevealInfo = {
  correctOptionIndex: number;
  correctLabel: string;
  revealedWine?: unknown;
};

/**
 * Iniciales para el avatar por defecto cuando un participante no tiene foto (§5.11).
 * Devuelve 1–2 letras MAYÚSCULAS: la inicial de la primera y la última palabra
 * (una sola letra si solo hay una palabra). Tolera vacío, espacios extra y
 * espacios al inicio/fin. Cadena vacía / solo espacios → "" (la UI cae a un genérico).
 */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  // Primer PUNTO DE CÓDIGO de cada palabra (no `charAt`, que parte emoji / pares
  // subrogados): los nombres son texto libre y pueden empezar por emoji.
  const firstCodePoint = (word: string): string => Array.from(word)[0] ?? "";
  if (words.length === 1) return firstCodePoint(words[0]!).toUpperCase();
  return (firstCodePoint(words[0]!) + firstCodePoint(words[words.length - 1]!)).toUpperCase();
}

/**
 * Estado autoritativo de la sala, lo posee la Sala (host) y se difunde a todos.
 *
 * `wineIndex`, `fase` y `step` solo son significativos cuando `stage === "playing"`;
 * en `lobby`/`wine_podium`/`final_podium` se conservan para saber qué vino acaba de
 * cerrarse (N = `wineIndex`).
 */
export type RoomState = {
  stage: Stage;
  wineIndex: number; // 0..WINE_COUNT-1
  fase: Fase;
  step: Step;
  scores: Record<string, number>; // participantId -> puntos acumulados (contrato §5.5)
  /**
   * Reparto de puntos de la ÚLTIMA Pregunta cerrada (§5.5): participantId → "+X".
   * Solo significativo durante `reveal` (lo fija el host al cerrar `quiz→reveal` para pintar
   * el "+X"); se limpia al entrar en una Pregunta nueva. `scores` es el acumulado.
   */
  lastAward?: Record<string, number>;
  /**
   * Temporizador del quiz (§5.3): timestamp ABSOLUTO en ms (epoch) en que vence la Pregunta
   * actual. Lo fija la Sala (host) al entrar en un `quiz` y se difunde; cada cliente calcula
   * el restante con su propio reloj (la cuenta atrás visible es COSMÉTICA). Solo significativo
   * en `playing/quiz`; fuera de `quiz` es `undefined` (sin cuenta atrás). El cierre real al
   * llegar a 0 lo dispara el host reusando `advance()` (reparte §5.5), no el reloj del cliente.
   */
  deadline?: number;
  /**
   * §5.6b-A — Pregunta activa difundida. La fija el HOST al entrar en `playing/quiz`
   * (de la `quiz-source`: BD o demo) y viaja en el broadcast; el jugador la RENDERIZA tal
   * cual (ya no deriva con `getQuestion`). Sin respuestas (anti-spoiler). `undefined` fuera
   * de quiz o mientras el host aún no la ha fijado (el jugador muestra "cargando…").
   */
  activeQuestion?: ActiveQuestion;
  /**
   * §5.6b-A — Reveal difundido. Lo fija el HOST al cerrar `quiz→reveal` (de `quiz-close` en
   * BD o local en demo) y viaja en el broadcast; el jugador pinta la opción correcta
   * (`correctOptionIndex`/`correctLabel`) y, si procede, `revealedWine`. Solo significativo
   * en `reveal`; se limpia (`undefined`) al entrar en una Pregunta nueva.
   */
  reveal?: RevealInfo;
  /**
   * §5.6b-A — Fuente de datos del juego para el badge "Datos demo". `"bd"` = preguntas/
   * settings/reveal de las edge functions; `"demo"` = fallback a constantes/`DEMO_WINES`.
   * Lo fija y difunde el HOST (al montar y, si un cierre cae a demo, también al cerrar).
   */
  source?: "bd" | "demo";
  updatedAt: number;
};

/** Duración del quiz por fase, en segundos (§5.3). Constantes; configurables = §5.8. */
export const FASE_SECONDS: Record<Fase, number> = {
  vista: 60,
  olfato: 60,
  gusto: 60,
  gamificacion: 60,
};

/**
 * Helper PURO (§5.3): `deadline` absoluto (ms) de un quiz que arranca en `now` para `fase`.
 * = `now + FASE_SECONDS[fase] * 1000`. Lo usa el host al entrar en cada `quiz`.
 */
export function quizDeadline(fase: Fase, now: number): number {
  return now + FASE_SECONDS[fase] * 1000;
}

export function initialRoomState(): RoomState {
  return {
    stage: "lobby",
    wineIndex: 0,
    fase: "vista",
    step: "quiz",
    scores: {},
    lastAward: {},
    updatedAt: 0,
  };
}

/**
 * Transición pura host-autoritativa de la máquina de estados (§5.1). Recibe el estado
 * actual y devuelve el siguiente; no muta el original ni toca `updatedAt` (eso lo hace
 * el hook al difundir). Implementa la I/O & Edge-Case Matrix:
 *
 *   lobby                         → playing, vino 0, vista/quiz
 *   playing · quiz                → reveal (misma fase)
 *   playing · reveal (fase<gamif) → siguiente fase, quiz
 *   playing · gamificacion/reveal → wine_podium (ranking parcial del vino N)
 *   wine_podium · N<últim         → playing, vino N+1, vista/quiz
 *   wine_podium · N=últim         → final_podium
 *   final_podium                  → final_podium (estado terminal; sin cambios)
 *
 * El reparto real de puntos lo añade §5.5: `scores` se transporta sin tocar.
 */
export function advanceState(state: RoomState): RoomState {
  switch (state.stage) {
    case "lobby":
      return { ...state, stage: "playing", wineIndex: 0, fase: "vista", step: "quiz" };

    case "playing": {
      // quiz → reveal dentro de la misma fase.
      if (state.step === "quiz") {
        return { ...state, step: "reveal" };
      }
      // reveal → siguiente fase (quiz); si era la última fase → podio parcial del vino N.
      const faseIdx = FASES.indexOf(state.fase);
      const nextFase = FASES[faseIdx + 1];
      if (nextFase) {
        return { ...state, fase: nextFase, step: "quiz" };
      }
      return { ...state, stage: "wine_podium" };
    }

    case "wine_podium": {
      // Vino N+1, o podio final si era el último.
      if (state.wineIndex >= WINE_COUNT - 1) {
        return { ...state, stage: "final_podium" };
      }
      return {
        ...state,
        stage: "playing",
        wineIndex: state.wineIndex + 1,
        fase: "vista",
        step: "quiz",
      };
    }

    case "final_podium":
      // Estado terminal: avanzar no hace nada.
      return state;
  }
}

/**
 * Pregunta de una fase (§5.2). NO viaja en `RoomState`: ambos lados la derivan de forma
 * determinista con `getQuestion(wineIndex, fase)` (mismo `options`/`correctIndex` para un
 * `(wineIndex, fase)` dado), de modo que Sala y Companion la pintan igual sin difundirla.
 */
export type Question = {
  fase: Fase;
  prompt: string;
  options: string[]; // 4 opciones en orden determinista (seed `wineIndex+fase`)
  correctIndex: number; // índice de la opción correcta dentro de `options`
};

/** ¿La opción `optionIndex` es la correcta de `question`? Índice fuera de rango = falso. */
export function isCorrect(optionIndex: number, question: Question): boolean {
  return optionIndex === question.correctIndex;
}

/** Reparto de puntos por acierto (§5.5). Configurables = §5.8; aquí van como constantes. */
export const BASE = 100; // puntos base a TODO el que acierta
export const BONUS_MAX = 50; // bonus del 1.º correcto por orden de llegada
export const BONUS_STEP = 10; // cuánto baja el bonus por cada puesto (mín. 0)

/**
 * Reparto PURO de puntos de una Pregunta (§5.5), host-autoritativo, sin React/Realtime.
 *
 * Para cada jugador que ACIERTA (`isCorrect(optionIndex, question)`):
 *   `BASE + max(0, BONUS_MAX − (puesto−1)×BONUS_STEP)`
 * donde `puesto` es su posición (1-based) entre los CORRECTOS ordenados por `seq` ascendente
 * (orden de llegada de la respuesta; la última cuenta — §5.3 lo cambiará a tiempo real).
 * Quien falla o no responde NO recibe entrada. Empate de `seq` se desempata por orden estable.
 *
 * Ejemplos: 1.º correcto → 150 (100+50), 2.º → 140, 3.º → 130 … 6.º → 100 (bonus a 0).
 */
export function computeAwards(
  answers: Record<string, { optionIndex: number; seq: number }>,
  question: Question,
): Record<string, number> {
  // Solo los correctos, ordenados por orden de llegada (seq asc) para asignar el bonus.
  const correct = Object.entries(answers)
    .filter(([, a]) => isCorrect(a.optionIndex, question))
    .sort((a, b) => a[1].seq - b[1].seq);

  const awards: Record<string, number> = {};
  correct.forEach(([playerId], i) => {
    const bonus = Math.max(0, BONUS_MAX - i * BONUS_STEP); // i = puesto−1
    awards[playerId] = BASE + bonus;
  });
  return awards;
}

/**
 * Eventos que envía el Companion (jugador) → recibidos por la Sala (host).
 * - `ready`: señal de "listo" en el lobby.
 * - `answer` (§5.2): elección del jugador en el quiz, etiquetada con el `(wineIndex, fase)`
 *   actual para que el host solo cuente las respuestas de la Pregunta vigente.
 */
export type PlayerEvent =
  | { kind: "ready"; playerId: string; name: string }
  | {
      kind: "answer";
      playerId: string;
      name: string;
      wineIndex: number;
      fase: Fase;
      optionIndex: number;
    };

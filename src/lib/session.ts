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
  score: number;
};

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
  updatedAt: number;
};

export function initialRoomState(): RoomState {
  return { stage: "lobby", wineIndex: 0, fase: "vista", step: "quiz", scores: {}, updatedAt: 0 };
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

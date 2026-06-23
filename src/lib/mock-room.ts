// Datos demo para previsualizar la Sala (`/room/:code?mock=...`) sin Supabase ni jugadores reales.
// Devuelve el MISMO contrato que `useRoomChannel` para que `/room/$code.tsx` lo consuma sin ramas.

import { useState } from "react";
import { WINE_COUNT, type Participant, type RoomState } from "./session";

export type MockScenario = "quiz" | "reveal" | "wine-podium" | "final";

const MOCK_PLAYERS: Participant[] = [
  { id: "p1", name: "Lucía Fernández", isHost: false, score: 0 },
  { id: "p2", name: "Marc Puig", isHost: false, score: 0 },
  { id: "p3", name: "Sara Ortega", isHost: false, score: 0 },
  { id: "p4", name: "Ignacio Ruiz", isHost: false, score: 0 },
  { id: "p5", name: "Berta Sanz", isHost: false, score: 0 },
  { id: "p6", name: "Dani Aragón", isHost: false, score: 0 },
];

const MOCK_QUESTION = {
  prompt: "¿Qué aroma predomina en este vino?",
  options: ["Frutos rojos", "Vainilla y madera", "Cítricos", "Hierba fresca"],
};

// Puntuaciones acumuladas verosímiles tras varios vinos jugados.
const MID_SCORES: Record<string, number> = {
  p1: 420,
  p2: 380,
  p3: 290,
  p4: 260,
  p5: 240,
  p6: 150,
};

const FINAL_SCORES: Record<string, number> = {
  p1: 1320,
  p2: 1180,
  p3: 980,
  p4: 870,
  p5: 760,
  p6: 540,
};

function baseState(): RoomState {
  return {
    stage: "lobby",
    wineIndex: 0,
    fase: "vista",
    step: "quiz",
    scores: {},
    lastAward: {},
    updatedAt: Date.now(),
    source: "demo",
  };
}

function quizState(): RoomState {
  return {
    ...baseState(),
    stage: "playing",
    wineIndex: 1, // vino 2 de 4
    fase: "olfato",
    step: "quiz",
    scores: MID_SCORES,
    activeQuestion: MOCK_QUESTION,
    deadline: Date.now() + 22_000, // 22s restantes (cuenta atrás visible)
  };
}

function revealState(): RoomState {
  return {
    ...baseState(),
    stage: "playing",
    wineIndex: 1,
    fase: "olfato",
    step: "reveal",
    scores: { ...MID_SCORES, p1: MID_SCORES.p1! + 150, p3: MID_SCORES.p3! + 140 },
    lastAward: { p1: 150, p3: 140 },
    activeQuestion: MOCK_QUESTION,
    reveal: { correctOptionIndex: 1, correctLabel: MOCK_QUESTION.options[1]! },
  };
}

function winePodiumState(): RoomState {
  return {
    ...baseState(),
    stage: "wine_podium",
    wineIndex: 1,
    fase: "gamificacion",
    step: "reveal",
    scores: MID_SCORES,
  };
}

function finalState(): RoomState {
  return {
    ...baseState(),
    stage: "final_podium",
    wineIndex: WINE_COUNT - 1,
    fase: "gamificacion",
    step: "reveal",
    scores: FINAL_SCORES,
  };
}

function stateFor(scenario: MockScenario): RoomState {
  switch (scenario) {
    case "quiz":
      return quizState();
    case "reveal":
      return revealState();
    case "wine-podium":
      return winePodiumState();
    case "final":
      return finalState();
  }
}

/** Devuelve el mismo shape que `useRoomChannel` con datos demo (host POV). */
export function mockRoom(scenario: MockScenario) {
  const state = stateFor(scenario);
  const players = MOCK_PLAYERS.map((p) => ({ ...p, score: state.scores[p.id] ?? 0 }));
  const hostParticipant: Participant = { id: "host", name: "Sala", isHost: true, score: 0 };
  const participants = [hostParticipant, ...players];

  // En `quiz` simulamos que 4 de 6 ya han respondido; en `reveal` todos tienen respuesta.
  const answers: Record<string, number> =
    state.step === "quiz" && state.stage === "playing"
      ? { p1: 1, p2: 0, p3: 1, p4: 2 }
      : state.step === "reveal" && state.stage === "playing"
        ? { p1: 1, p2: 0, p3: 1, p4: 2, p5: 3 } // p6 no respondió
        : {};
  const answeredIds = new Set(Object.keys(answers));

  const noop = () => {};
  const asyncNoop = async () => {};

  return {
    configured: true,
    connected: true,
    meId: "host",
    participants,
    state,
    updateState: noop,
    advance: asyncNoop,
    reset: noop,
    sendReady: noop,
    submitAnswer: noop,
    answers,
    answeredIds,
    myAnswer: null,
    finishState: (state.stage === "final_podium" ? "saved" : "idle") as
      | "idle"
      | "saving"
      | "saved"
      | "error",
  };
}

// ─── POV del jugador ────────────────────────────────────────────────────────
// Mismo dataset que el host pero desde la perspectiva de un participante:
// inyectamos "Tú" (meId="me") en la lista y aceptamos un scenario extra "lobby"
// (en host no aplica). `submitAnswer` es stateful para que la previsualización
// del quiz responda al tap igual que en producción.

export type MockPlayerScenario = "lobby" | "quiz" | "reveal" | "wine-podium" | "final";

const ME_ID = "me";
const ME_NAME = "Tú";

// Score de "me" elegido para que en cada escenario ocupe un puesto verosímil
// en el ranking (3.º en podio parcial, 4.º en final): suficiente para previsualizar
// medallas/posiciones sin que siempre gane el jugador.
const ME_MID_SCORE = 310;
const ME_FINAL_SCORE = 1050;

function lobbyState(): RoomState {
  return { ...baseState(), stage: "lobby", scores: {} };
}

function playerStateFor(scenario: MockPlayerScenario): RoomState {
  if (scenario === "lobby") return lobbyState();
  const s = stateFor(scenario);
  // Inyectar al jugador "me" en los scores acumulados (excepto en lobby).
  const meScore = scenario === "final" ? ME_FINAL_SCORE : ME_MID_SCORE;
  return { ...s, scores: { ...s.scores, [ME_ID]: meScore } };
}

/**
 * Devuelve el mismo shape que `useRoomChannel` (POV jugador) con datos demo.
 * Es un hook porque `submitAnswer` es stateful: en `quiz` el tap actualiza
 * `myAnswer` localmente para que la previsualización sea fiel al producto.
 */
export function useMockPlayerRoom(scenario: MockPlayerScenario) {
  const state = playerStateFor(scenario);
  const mePlayer: Participant = { id: ME_ID, name: ME_NAME, isHost: false, score: state.scores[ME_ID] ?? 0 };
  const others = MOCK_PLAYERS.slice(0, 5).map((p) => ({ ...p, score: state.scores[p.id] ?? 0 }));
  const hostParticipant: Participant = { id: "host", name: "Sala", isHost: true, score: 0 };
  const participants = [hostParticipant, mePlayer, ...others];

  // En reveal "me" acertó (opción 1 = correcta) y recibe un award visible.
  const revealAward = scenario === "reveal" ? { ...state.lastAward, [ME_ID]: 145 } : state.lastAward;
  const finalState: RoomState = scenario === "reveal" ? { ...state, lastAward: revealAward } : state;

  // myAnswer: en reveal viene pre-elegido (=correcto); en quiz arranca null
  // y se actualiza por `submitAnswer` para previsualizar el feedback de selección.
  const [myAnswer, setMyAnswer] = useState<number | null>(scenario === "reveal" ? 1 : null);

  const noop = () => {};
  const asyncNoop = async () => {};

  return {
    configured: true,
    connected: true,
    meId: ME_ID,
    participants,
    state: finalState,
    updateState: noop,
    advance: asyncNoop,
    reset: noop,
    sendReady: noop,
    submitAnswer: (i: number) => {
      if (finalState.step === "reveal") return; // tras el reveal no se cambia.
      setMyAnswer(i);
    },
    answers: {} as Record<string, number>,
    answeredIds: new Set<string>(),
    myAnswer,
    finishState: "idle" as "idle" | "saving" | "saved" | "error",
  };
}

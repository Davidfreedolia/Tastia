// Contrato de la sesión de cata en vivo. Sincronizado por Supabase Realtime
// en el canal `room:{code}`. Ver docs/ARCHITECTURE.md.

export type SessionPhase =
  | "lobby" // sala de espera, los jugadores se unen
  | "intro" // bienvenida del sommelier
  | "tasting" // cata a ciegas del vino actual (se reciben apuestas)
  | "reveal" // se revela la ficha del vino + puntos
  | "scoring" // marcador
  | "finished"; // podio final

export const WINE_COUNT = 4;

export const PHASE_LABEL: Record<SessionPhase, string> = {
  lobby: "Sala de espera",
  intro: "Bienvenida",
  tasting: "Cata a ciegas",
  reveal: "Revelación",
  scoring: "Puntuación",
  finished: "Podio final",
};

export type Participant = {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
};

/** Apuesta de un jugador para un vino. */
export type Guess = {
  grape?: string; // variedad
  region?: string; // D.O.
  priceRange?: string; // rango de precio
  vintage?: string; // añada
};

/** Ficha de un vino (se revela al final de cada ronda). */
export type Wine = {
  index: number; // 0..WINE_COUNT-1
  name: string;
  bodega: string;
  region: string; // D.O.
  grape: string; // variedad
  priceRange: string; // p. ej. "10-25€"
  vintage: number;
  note: string; // curiosidad / nota de cata
};

/** Estado autoritativo de la sala, lo posee la Sala (host) y se difunde a todos. */
export type RoomState = {
  phase: SessionPhase;
  currentWineIndex: number; // 0..WINE_COUNT-1
  scores: Record<string, number>; // participantId -> puntos
  // Resultado de la última revelación: vino + puntos otorgados a cada jugador.
  lastReveal?: { wineIndex: number; wine: Wine; awarded: Record<string, number> };
  updatedAt: number;
};

export function initialRoomState(): RoomState {
  return { phase: "lobby", currentWineIndex: 0, scores: {}, updatedAt: 0 };
}

/** Eventos que envía el Companion (jugador) → recibidos por la Sala (host). */
export type PlayerEvent =
  | { kind: "ready"; playerId: string; name: string }
  | {
      kind: "answer";
      playerId: string;
      name: string;
      wineIndex: number;
      guess: Guess;
    };

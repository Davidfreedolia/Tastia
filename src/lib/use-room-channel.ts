import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigured } from "./supabase";
import {
  initialRoomState,
  type Guess,
  type Participant,
  type PlayerEvent,
  type RoomState,
} from "./session";
import { DEMO_WINES, scoreGuess } from "./wines";

function makeId() {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  return c?.randomUUID ? c.randomUUID() : `p_${Math.random().toString(36).slice(2, 10)}`;
}

export type RoomAnswer = Extract<PlayerEvent, { kind: "answer" }>;

type Role = "host" | "player";

/**
 * Conecta a un canal Realtime `room:{code}`.
 * - presence → lista de participantes (quién está en la sala).
 * - broadcast "state" → estado autoritativo (lo emite el host, lo adoptan los jugadores).
 * - broadcast "player" → eventos del jugador (apuesta / listo), los procesa el host.
 *
 * No requiere tablas en la BD: presence + broadcast funcionan solo con el canal.
 * La persistencia (tasting_sessions, etc.) se añade después.
 */
export function useRoomChannel(opts: { code: string; role: Role; name?: string }) {
  const { code, role, name } = opts;

  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [state, setState] = useState<RoomState>(initialRoomState());
  const [answers, setAnswers] = useState<RoomAnswer[]>([]); // host: apuestas del vino actual

  const channelRef = useRef<RealtimeChannel | null>(null);
  const meIdRef = useRef<string>("");
  const stateRef = useRef<RoomState>(state);
  stateRef.current = state;
  const answersRef = useRef<RoomAnswer[]>(answers);
  answersRef.current = answers;

  const broadcastState = useCallback((next: RoomState) => {
    channelRef.current?.send({ type: "broadcast", event: "state", payload: next });
  }, []);

  /** Host: muta el estado autoritativo y lo difunde. */
  const updateState = useCallback(
    (patch: Partial<RoomState>) => {
      if (role !== "host") return;
      setState((prev) => {
        const next = { ...prev, ...patch, updatedAt: Date.now() };
        broadcastState(next);
        return next;
      });
    },
    [role, broadcastState],
  );

  /** Host: cierra apuestas del vino actual, reparte puntos y revela la ficha. */
  const revealCurrentWine = useCallback(() => {
    if (role !== "host") return;
    const wine = DEMO_WINES[stateRef.current.currentWineIndex];
    if (!wine) return;
    const awarded: Record<string, number> = {};
    const scores = { ...stateRef.current.scores };
    for (const a of answersRef.current) {
      if (a.wineIndex !== wine.index) continue;
      const pts = scoreGuess(a.guess, wine);
      awarded[a.playerId] = pts;
      scores[a.playerId] = (scores[a.playerId] ?? 0) + pts;
    }
    updateState({
      phase: "reveal",
      scores,
      lastReveal: { wineIndex: wine.index, wine, awarded },
    });
  }, [role, updateState]);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const supabase = getSupabase();
    if (!supabase) return;
    if (!meIdRef.current) meIdRef.current = makeId();
    const meId = meIdRef.current;

    const channel = supabase.channel(`room:${code}`, {
      config: { presence: { key: meId } },
    });
    channelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      const ps = channel.presenceState<{ name: string; isHost: boolean }>();
      const list: Participant[] = Object.entries(ps).map(([id, metas]) => {
        const m = metas[0];
        return {
          id,
          name: m?.name ?? "Invitado",
          isHost: !!m?.isHost,
          score: stateRef.current.scores[id] ?? 0,
        };
      });
      setParticipants(list);
      // El host reenvía el estado cuando alguien entra/sale (para los que llegan tarde).
      if (role === "host") broadcastState(stateRef.current);
    });

    channel.on("broadcast", { event: "state" }, ({ payload }) => {
      if (role === "player") setState(payload as RoomState);
    });

    channel.on("broadcast", { event: "player" }, ({ payload }) => {
      if (role !== "host") return;
      const ev = payload as PlayerEvent;
      if (ev.kind === "answer") {
        setAnswers((prev) => {
          const others = prev.filter(
            (a) => !(a.playerId === ev.playerId && a.wineIndex === ev.wineIndex),
          );
          return [...others, ev];
        });
      }
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setConnected(true);
        await channel.track({
          name: name ?? (role === "host" ? "Sala" : "Invitado"),
          isHost: role === "host",
        });
        if (role === "host") broadcastState(stateRef.current);
      }
    });

    return () => {
      setConnected(false);
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [code, role, name, broadcastState]);

  // El host limpia las apuestas al cambiar de vino.
  useEffect(() => {
    if (role === "host") setAnswers([]);
  }, [state.currentWineIndex, role]);

  /** Jugador: envía su apuesta para el vino actual. */
  const submitAnswer = useCallback(
    (guess: Guess) => {
      const ev: PlayerEvent = {
        kind: "answer",
        playerId: meIdRef.current,
        name: name ?? "Invitado",
        wineIndex: stateRef.current.currentWineIndex,
        guess,
      };
      channelRef.current?.send({ type: "broadcast", event: "player", payload: ev });
    },
    [name],
  );

  /** Jugador: señal de "listo". */
  const sendReady = useCallback(() => {
    const ev: PlayerEvent = { kind: "ready", playerId: meIdRef.current, name: name ?? "Invitado" };
    channelRef.current?.send({ type: "broadcast", event: "player", payload: ev });
  }, [name]);

  return {
    configured: supabaseConfigured,
    connected,
    meId: meIdRef.current,
    participants,
    state,
    answers,
    updateState, // host
    revealCurrentWine, // host
    submitAnswer, // player
    sendReady, // player
  };
}

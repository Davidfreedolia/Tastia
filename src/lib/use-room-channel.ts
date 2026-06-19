import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigured } from "./supabase";
import {
  advanceState,
  initialRoomState,
  type Participant,
  type PlayerEvent,
  type RoomState,
} from "./session";

function makeId() {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  return c?.randomUUID ? c.randomUUID() : `p_${Math.random().toString(36).slice(2, 10)}`;
}

type Role = "host" | "player";

/**
 * Conecta a un canal Realtime `room:{code}`.
 * - presence → lista de participantes (quién está en la sala).
 * - broadcast "state" → estado autoritativo (lo emite el host, lo adoptan los jugadores).
 * - broadcast "player" → eventos del jugador (listo), los procesa el host.
 *
 * No requiere tablas en la BD: presence + broadcast funcionan solo con el canal.
 * El estado de la sesión es efímero (no se persiste). La persistencia se añade después.
 */
export function useRoomChannel(opts: { code: string; role: Role; name?: string }) {
  const { code, role, name } = opts;

  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [state, setState] = useState<RoomState>(initialRoomState());

  const channelRef = useRef<RealtimeChannel | null>(null);
  const meIdRef = useRef<string>("");
  const stateRef = useRef<RoomState>(state);
  stateRef.current = state;

  const broadcastState = useCallback((next: RoomState) => {
    channelRef.current?.send({ type: "broadcast", event: "state", payload: next });
  }, []);

  /** Host: muta el estado autoritativo y lo difunde. */
  const updateState = useCallback(
    (patch: Partial<RoomState>) => {
      if (role !== "host") return;
      // El broadcast va FUERA del updater de setState: un updater debe ser puro
      // (en StrictMode se invoca dos veces y duplicaría la emisión de red).
      const next = { ...stateRef.current, ...patch, updatedAt: Date.now() };
      setState(next);
      broadcastState(next);
    },
    [role, broadcastState],
  );

  /**
   * Host: única transición de la máquina de estados (§5.1). Aplica `advanceState()`
   * y difunde el resultado. En §5.3 el paso `quiz → reveal` también se disparará por
   * temporizador; aquí solo lo dispara el host (el jugador nunca controla el avance).
   */
  const advance = useCallback(() => {
    if (role !== "host") return;
    // Igual que updateState: efecto de red fuera del updater (StrictMode-safe).
    const next = { ...advanceState(stateRef.current), updatedAt: Date.now() };
    setState(next);
    broadcastState(next);
  }, [role, broadcastState]);

  /** Host: reinicia la sesión (vuelve al lobby y limpia puntuaciones). */
  const reset = useCallback(() => {
    if (role !== "host") return;
    const next = { ...initialRoomState(), updatedAt: Date.now() };
    setState(next);
    broadcastState(next);
  }, [role, broadcastState]);

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
      // El host reenvía el estado cuando alguien entra/sale (para los que llegan tarde
      // o reconectan): adoptan el estado actual y conservan sus puntos.
      if (role === "host") broadcastState(stateRef.current);
    });

    channel.on("broadcast", { event: "state" }, ({ payload }) => {
      if (role !== "player") return;
      // Guarda de monotonía: ignora estados más antiguos que el ya adoptado
      // (broadcasts reordenados o reenvíos de catch-up retrasados).
      const next = payload as RoomState;
      setState((prev) => (next.updatedAt < prev.updatedAt ? prev : next));
    });

    channel.on("broadcast", { event: "player" }, ({ payload }) => {
      if (role !== "host") return;
      const ev = payload as PlayerEvent;
      // Eventos del jugador (p. ej. "ready"). El reparto de respuestas del quiz = §5.2.
      void ev;
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
    updateState, // host
    advance, // host
    reset, // host
    sendReady, // player
  };
}

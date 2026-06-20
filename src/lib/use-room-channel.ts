import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigured } from "./supabase";
import {
  advanceState,
  initialRoomState,
  type Fase,
  type Participant,
  type PlayerEvent,
  type RoomState,
} from "./session";

/** Clave intrínseca de la Pregunta actual `(wineIndex, fase)`. Las respuestas/selección
 *  se etiquetan con ella, así que al cambiar de Pregunta los valores viejos se ignoran
 *  por derivación (sin necesidad de un efecto que los limpie). */
function qKey(s: { wineIndex: number; fase: Fase }): string {
  return `${s.wineIndex}:${s.fase}`;
}

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

  // §5.2 — Respuestas de la Pregunta actual, ETIQUETADAS con su clave `(wineIndex, fase)`.
  // Host: `{ key, map: playerId → optionIndex }` de la Pregunta vigente (efímero).
  //   Companion: `{ key, optionIndex }` con su propia elección local. Al cambiar de
  //   Pregunta la clave deja de coincidir y los valores viejos se descartan al derivar
  //   `answers`/`myAnswer` (sin efecto de limpieza ni carrera recoger-vaciar).
  const [answersRec, setAnswersRec] = useState<{ key: string; map: Record<string, number> }>({
    key: "",
    map: {},
  });
  const [myAnswerRec, setMyAnswerRec] = useState<{ key: string; optionIndex: number } | null>(null);

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
    setAnswersRec({ key: "", map: {} }); // §5.2 — descarta respuestas de la cata anterior.
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
      if (ev.kind !== "answer") return; // "ready" no afecta al estado de la cata aquí.

      const s = stateRef.current;
      // Solo se cuentan respuestas de la Pregunta vigente y mientras el quiz está abierto:
      // tras `advance` quiz→reveal se ignoran (cierre); y si llega de otra `(wineIndex,fase)`
      // (reordenadas / retrasadas) también se descarta.
      if (s.stage !== "playing" || s.step !== "quiz") return;
      if (ev.wineIndex !== s.wineIndex || ev.fase !== s.fase) return;
      // Índice de opción fuera de rango → se descarta (4 opciones: 0..3).
      if (!Number.isInteger(ev.optionIndex) || ev.optionIndex < 0 || ev.optionIndex > 3) return;

      // Una respuesta por jugador/Pregunta: la última reemplaza a la anterior. El registro
      // va etiquetado con la clave de la Pregunta vigente: si coincide, mergea; si la
      // Pregunta cambió, reemplaza en bloque (sin arrastrar respuestas de la anterior).
      const k = qKey(s);
      setAnswersRec((prev) =>
        prev.key === k
          ? { key: k, map: { ...prev.map, [ev.playerId]: ev.optionIndex } }
          : { key: k, map: { [ev.playerId]: ev.optionIndex } },
      );
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

  /**
   * Jugador: envía (o cambia) su respuesta del quiz. Difunde el `optionIndex` con el
   * `(wineIndex, fase)` actuales y guarda la elección localmente (`myAnswer`) para
   * resaltarla y mostrar su ✓/✗ en `reveal`. Solo tiene efecto mientras `step==="quiz"`.
   */
  const submitAnswer = useCallback(
    (optionIndex: number) => {
      if (role !== "player") return;
      const s = stateRef.current;
      if (s.stage !== "playing" || s.step !== "quiz") return;
      // Selección local etiquetada con la Pregunta vigente: al cambiar de Pregunta deja
      // de coincidir la clave y `myAnswer` se deriva como null (sin efecto de limpieza).
      setMyAnswerRec({ key: qKey(s), optionIndex });
      const ev: PlayerEvent = {
        kind: "answer",
        playerId: meIdRef.current,
        name: name ?? "Invitado",
        wineIndex: s.wineIndex,
        fase: s.fase,
        optionIndex,
      };
      channelRef.current?.send({ type: "broadcast", event: "player", payload: ev });
    },
    [role, name],
  );

  // §5.2 — Valores expuestos DERIVADOS contra la clave de la Pregunta ACTUAL: si el
  // registro guardado pertenece a otra `(wineIndex, fase)` (transición a nueva Pregunta,
  // reset o lobby), se ignora y se parte de vacío/sin selección.
  const currentKey = qKey(state);
  const answers = answersRec.key === currentKey ? answersRec.map : {};
  const myAnswer = myAnswerRec?.key === currentKey ? myAnswerRec.optionIndex : null;

  // §5.2 — Contrato "respondió": conjunto de jugadores que han respondido la Pregunta
  // actual (lo consumirán el halo de §5.11 y el reparto de puntos de §5.5). Se intersecta
  // con los participantes presentes: nunca contiene a quien ya no está en la sala.
  const answeredIds = new Set(
    Object.keys(answers).filter((id) => participants.some((p) => p.id === id)),
  );

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
    submitAnswer, // player — envía/cambia la respuesta del quiz
    answers, // host — playerId → optionIndex de la Pregunta actual (✓/✗ en reveal)
    answeredIds, // host — Set de jugadores que han respondido (contrato §5.11/§5.5)
    myAnswer, // player — su elección local (null si no ha respondido)
  };
}

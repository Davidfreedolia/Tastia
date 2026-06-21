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
import {
  demoQuizSource,
  loadQuizSource,
  secondsFor,
  type CloseResult,
  type QuizSource,
} from "./quiz-source";
import { buildFinishPayload } from "./session-finish";

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
export function useRoomChannel(opts: { code: string; role: Role; name?: string; photo?: string }) {
  const { code, role, name, photo } = opts;

  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [state, setState] = useState<RoomState>(initialRoomState());

  // §5.2/§5.5 — Respuestas de la Pregunta actual, ETIQUETADAS con su clave `(wineIndex, fase)`.
  // Host: `{ key, map: playerId → { optionIndex, seq }, nextSeq }` de la Pregunta vigente
  //   (efímero). `seq` = orden de llegada de la respuesta (contador incremental por Pregunta);
  //   se reasigna en cada respuesta del jugador, así que la ÚLTIMA cuenta también para el orden
  //   (lo consume el reparto de puntos §5.5; §5.3 lo cambiará a tiempo real).
  //   Companion: `{ key, optionIndex }` con su propia elección local. Al cambiar de
  //   Pregunta la clave deja de coincidir y los valores viejos se descartan al derivar
  //   `answers`/`myAnswer` (sin efecto de limpieza ni carrera recoger-vaciar).
  const [answersRec, setAnswersRec] = useState<{
    key: string;
    map: Record<string, { optionIndex: number; seq: number }>;
    nextSeq: number;
  }>({
    key: "",
    map: {},
    nextSeq: 0,
  });
  const [myAnswerRec, setMyAnswerRec] = useState<{ key: string; optionIndex: number } | null>(null);

  // §5.6b-B — Persistencia de la partida al entrar en `final_podium` (host-only, modo BD).
  // `finishedRef` = guard de idempotencia (igual que `closingRef`): `final_podium` se difunde y
  // re-difunde (catch-up/presence sync + StrictMode), así que `session-finish` debe llamarse UNA
  // vez por partida; `reset()` lo rearma. `finishState` = indicador discreto para la UI del host.
  const finishedRef = useRef(false);
  const [finishState, setFinishState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const channelRef = useRef<RealtimeChannel | null>(null);
  const meIdRef = useRef<string>("");
  const stateRef = useRef<RoomState>(state);
  stateRef.current = state;
  // §5.6b-A — Fuente del quiz (BD o demo). Arranca SÍNCRONA en demo para que el host pueda
  // fijar `activeQuestion`/`deadline` desde el primer `advance` aunque el bootstrap aún no
  // haya respondido; el efecto de abajo la sustituye por la de BD cuando `loadQuizSource`
  // resuelve. La consume `advance()` (host); el jugador solo renderiza lo difundido.
  const quizSourceRef = useRef<QuizSource>(demoQuizSource());
  // §5.6b-A — Fuente CAPTURADA de la Pregunta en curso: se fija al ENTRAR en el quiz y se usa al
  // CERRAR, para que servir y puntuar usen SIEMPRE la misma fuente (aunque `quizSourceRef` cambie a
  // media pregunta cuando `loadQuizSource` resuelve). Nunca puntúa una pregunta BD con demo (ni al revés).
  const activeSrcRef = useRef<QuizSource>(quizSourceRef.current);
  // §5.6b-A — Guard de reentrada del cierre `quiz→reveal`: `closeQuiz` es async (await de la
  // edge function), y el timer y el botón pueden dispararse a la vez; este flag garantiza un
  // ÚNICO cierre por Pregunta (el segundo se ignora).
  const closingRef = useRef(false);
  // Espejo de `answersRec` para que el `advance()` memoizado lea las respuestas vigentes sin
  // recrearse en cada respuesta (mismo patrón que `stateRef`); el reparto §5.5 lo consume.
  const answersRecRef = useRef(answersRec);
  answersRecRef.current = answersRec;

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
   * Host: única transición de la máquina de estados (§5.1), ahora ASYNC (§5.6b-A) porque el
   * cierre `quiz→reveal` puntúa/revela vía la `quiz-source` (la BD lo hace con un `await` a
   * `quiz-close`; en demo es síncrono envuelto en una Promise). Los llamadores (botón y timer)
   * la invocan fire-and-forget; el `closingRef` evita un doble cierre si coinciden.
   *
   * Al ENTRAR en quiz fija `activeQuestion` (sin respuesta) + `deadline` (de los settings) +
   * `source` y los difunde; al CERRAR aplica `reveal` + reparto y los difunde. El jugador solo
   * renderiza lo difundido (ya no deriva con `getQuestion`).
   */
  const advance = useCallback(async () => {
    if (role !== "host") return;
    // Igual que updateState: efecto de red fuera del updater (StrictMode-safe).
    const prev = stateRef.current;
    const next: RoomState = { ...advanceState(prev), updatedAt: Date.now() };

    const isClosing =
      prev.stage === "playing" &&
      prev.step === "quiz" &&
      next.stage === "playing" &&
      next.step === "reveal";

    // §5.6b-A — Al ENTRAR en un quiz: el host fija la pregunta activa (de la quiz-source, sin
    // respuesta), el `deadline` absoluto según los settings de esa fase y el `source`; limpia el
    // reveal anterior. Fuera de quiz no hay cuenta atrás ni pregunta activa.
    if (next.stage === "playing" && next.step === "quiz") {
      const src = quizSourceRef.current;
      activeSrcRef.current = src; // captura la fuente para servir Y cerrar ESTA Pregunta
      next.activeQuestion = src.questionFor(next.wineIndex, next.fase);
      next.deadline = Date.now() + secondsFor(src.settings, next.fase) * 1000;
      next.reveal = undefined;
      next.source = src.source;
    } else {
      next.deadline = undefined;
    }

    // §5.5/§5.6b-A — Cierre `playing/quiz → playing/reveal`: puntúa y revela una sola vez por
    // Pregunta. Guard de reentrada (`closingRef`) durante el `await` de `quiz-close`: si ya hay
    // un cierre en curso, el segundo disparo (timer/botón) se ignora.
    if (isClosing) {
      if (closingRef.current) return;
      closingRef.current = true;
      try {
        // Solo cuentan las respuestas de la Pregunta que se cierra (su clave `(wineIndex, fase)`).
        const k = qKey(prev);
        const rec = answersRecRef.current;
        const rawMap = rec.key === k ? rec.map : {};
        // §5.5 (revisión): solo cuentan las respuestas de jugadores AÚN presentes — uno que
        // respondió y se fue no debe ocupar un puesto del bonus ni acumular puntos fantasma.
        const presentIds = new Set(Object.keys(channelRef.current?.presenceState() ?? {}));
        const map = Object.fromEntries(
          Object.entries(rawMap).filter(([id]) => presentIds.has(id)),
        );

        // MISMA fuente que sirvió la Pregunta (capturada al entrar): nunca mezcla BD↔demo.
        const src = activeSrcRef.current;
        let r: CloseResult;
        try {
          r = await src.closeQuiz(prev.wineIndex, prev.fase, map);
        } catch {
          // `quiz-close` (BD) falló: NO se puntúa con demo (sería otra pregunta, otro orden de
          // opciones). La ronda queda SIN puntos y sin marcar correcta — el juego no se rompe.
          r = { correctOptionIndex: -1, correctLabel: "", awards: {} };
        }

        // Guard de carrera: si durante el `await` el estado cambió (reset/avance), NO clobbear.
        const cur = stateRef.current;
        if (
          cur.stage !== "playing" ||
          cur.step !== "quiz" ||
          cur.wineIndex !== prev.wineIndex ||
          cur.fase !== prev.fase
        ) {
          return;
        }

        // Acumula sobre `scores` (no muta el previo); coerciona a número (payload de red).
        const scores = { ...prev.scores };
        for (const [id, pts] of Object.entries(r.awards)) {
          scores[id] = (scores[id] ?? 0) + Number(pts || 0);
        }
        next.scores = scores;
        next.lastAward = r.awards;
        next.reveal = {
          correctOptionIndex: r.correctOptionIndex,
          correctLabel: r.correctLabel,
          revealedWine: r.revealedWine,
        };
      } finally {
        closingRef.current = false;
      }
    } else {
      // Fuera del cierre de quiz, el "+X" no aplica: se limpia al entrar en una Pregunta nueva.
      next.lastAward = {};
    }

    setState(next);
    broadcastState(next);
  }, [role, broadcastState]);

  /** Host: reinicia la sesión (vuelve al lobby y limpia puntuaciones). */
  const reset = useCallback(() => {
    if (role !== "host") return;
    const next = { ...initialRoomState(), updatedAt: Date.now() };
    setState(next);
    setAnswersRec({ key: "", map: {}, nextSeq: 0 }); // §5.2 — descarta respuestas de la cata anterior.
    // §5.6b-B — rearma el guard de persistencia: la siguiente partida en BD podrá persistir de nuevo.
    finishedRef.current = false;
    setFinishState("idle");
    broadcastState(next);
  }, [role, broadcastState]);

  // §5.6b-A — Carga de la fuente del quiz al montar (host-only). Intenta la BD (`quiz-bootstrap`);
  // si falla/timeout o Supabase no está configurado, queda la demo síncrona inicial. Al resolver,
  // sustituye `quizSourceRef` y difunde el `source` para el badge "Datos demo". No bloquea el
  // primer `advance`: hasta que resuelva, el host usa la demo (juego plenamente funcional).
  useEffect(() => {
    if (role !== "host") return;
    let alive = true;
    loadQuizSource(code).then((src) => {
      if (!alive) return;
      quizSourceRef.current = src;
      updateState({ source: src.source });
    });
    return () => {
      alive = false;
    };
  }, [role, code, updateState]);

  // §5.3 — Cierre automático HOST-AUTORITATIVO. Cuando el estado es `playing/quiz` con un
  // `deadline`, la Sala (y SOLO la Sala) programa un único `setTimeout` que, al vencer y SI
  // sigue en esa misma Pregunta, dispara `advance()` (quiz→reveal, que reparte §5.5). El
  // botón manual sigue funcionando: al avanzar antes de tiempo `state` cambia, este efecto
  // se re-ejecuta y limpia el timeout pendiente (no re-dispara). Los jugadores no corren
  // este timer (no son autoridad); su cuenta atrás es solo cosmética.
  useEffect(() => {
    if (role !== "host") return;
    if (state.stage !== "playing" || state.step !== "quiz") return;
    if (state.deadline === undefined) return;

    const deadline = state.deadline;
    const delay = Math.max(0, deadline - Date.now());
    const id = setTimeout(() => {
      // Reverifica contra el estado VIGENTE: si se cerró a mano (ya no estamos en este quiz,
      // p.ej. otra `(wineIndex,fase)`/step o `deadline` distinto), no re-dispara.
      const s = stateRef.current;
      if (s.stage === "playing" && s.step === "quiz" && s.deadline === deadline) {
        void advance(); // §5.6b-A — `advance` es async; fire-and-forget (el guard evita doble cierre).
      }
    }, delay);
    return () => clearTimeout(id);
  }, [role, state.stage, state.step, state.deadline, advance]);

  // §5.6b-B — Persistencia HOST-AUTORITATIVA al entrar en `final_podium` (solo modo BD). El host
  // construye `players[]` (jugadores ordenados por puntos → posición) + la foto del ganador y llama
  // a `session-finish` UNA sola vez (guard `finishedRef`, anti re-broadcast/StrictMode). En demo el
  // payload es `null` (no se persiste). Si la llamada falla, NO rompe el podio: solo marca "error".
  useEffect(() => {
    if (role !== "host") return;
    if (state.stage !== "final_podium") return;
    if (finishedRef.current) return; // ya disparado en esta partida (re-broadcast / re-entrada).

    const payload = buildFinishPayload({
      code,
      hostName: name ?? "Sala",
      participants,
      scores: state.scores,
      source: quizSourceRef.current.source,
    });
    if (payload === null) return; // demo o sin jugadores: nada que persistir.

    // Marca el guard ANTES del await (anti doble-disparo en StrictMode / re-renders).
    finishedRef.current = true;
    setFinishState("saving");

    // Aplica el resultado. Si falla: loguea y rearma `finishedRef` (permite reintentar si cambia algún
    // disparador — NO en bucle). Solo refleja el estado si seguimos en este podio: un `reset()` o avance
    // durante la llamada lo invalida (no pisar el nuevo estado con un "saved/error" tardío).
    const settle = (ok: boolean, err?: unknown) => {
      if (!ok) {
        console.error("[session-finish] no se pudo persistir la sesión:", err);
        finishedRef.current = false;
      }
      if (stateRef.current.stage === "final_podium") setFinishState(ok ? "saved" : "error");
    };

    const sb = getSupabase();
    if (!sb) {
      settle(false, new Error("Supabase no configurado"));
      return;
    }
    sb.functions
      .invoke("session-finish", { body: payload })
      .then(({ error }) => settle(!error, error))
      .catch((e) => settle(false, e));
  }, [role, state.stage, state.source, state.scores, participants, code, name]);

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
      const ps = channel.presenceState<{ name: string; isHost: boolean; photo?: string }>();
      const list: Participant[] = Object.entries(ps).map(([id, metas]) => {
        const m = metas[0];
        return {
          id,
          name: m?.name ?? "Invitado",
          isHost: !!m?.isHost,
          score: stateRef.current.scores[id] ?? 0,
          // §5.11 — foto en vivo desde la metadata de presence (data-URL reducido); opcional.
          photo: m?.photo,
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
      // `seq` = contador incremental por Pregunta: marca el orden de llegada de ESTA respuesta
      // (al cambiar/reenviar, la última vuelve a tomar el seq más alto → la última cuenta).
      const k = qKey(s);
      setAnswersRec((prev) => {
        const base = prev.key === k ? prev : { key: k, map: {}, nextSeq: 0 };
        return {
          key: k,
          map: { ...base.map, [ev.playerId]: { optionIndex: ev.optionIndex, seq: base.nextSeq } },
          nextSeq: base.nextSeq + 1,
        };
      });
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setConnected(true);
        await channel.track({
          name: name ?? (role === "host" ? "Sala" : "Invitado"),
          isHost: role === "host",
          // §5.11 — foto en vivo (data-URL ~128px JPEG) en presence; ausente si no hay.
          ...(photo ? { photo } : {}),
        });
        if (role === "host") broadcastState(stateRef.current);
      }
    });

    return () => {
      setConnected(false);
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [code, role, name, photo, broadcastState]);

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
  // El registro interno guarda `{ optionIndex, seq }` por jugador (seq = orden, §5.5). Hacia
  // fuera se expone el contrato §5.2 estable `playerId → optionIndex` (para ✓/✗ en reveal).
  const answersMap = answersRec.key === currentKey ? answersRec.map : {};
  const answers: Record<string, number> = {};
  for (const [id, a] of Object.entries(answersMap)) answers[id] = a.optionIndex;
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
    finishState, // host — §5.6b-B: estado de la persistencia en final_podium (idle/saving/saved/error)
  };
}

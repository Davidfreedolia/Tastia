import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Cast as CastIcon } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { CastTvDialog } from "@/components/CastTvDialog";
import { Countdown } from "@/components/Countdown";
import { useRoomChannel } from "@/lib/use-room-channel";
import { mockRoom, type MockScenario } from "@/lib/mock-room";
import {
  FASE_LABEL,
  initials,
  STAGE_LABEL,
  WINE_COUNT,
  type Participant,
  type RoomState,
} from "@/lib/session";

// `?mock=quiz|reveal|wine-podium|final` (o `?mock=1` → reveal) pinta la Sala con datos demo
// sin Supabase ni jugadores reales: útil para iterar sobre el layout.
const MOCK_SCENARIO = z.enum(["quiz", "reveal", "wine-podium", "final"]);
const mockSearch = z
  .object({ mock: z.union([MOCK_SCENARIO, z.literal("1"), z.literal("")]).optional() })
  .parse;

export const Route = createFileRoute("/room/$code")({
  validateSearch: (s) => mockSearch(s),
  component: RoomPage,
});

/** Label del botón guiado único según `(stage, fase, step)`. */
function nextLabel(state: RoomState, hasPlayers: boolean): string {
  switch (state.stage) {
    case "lobby":
      return hasPlayers ? "Empezar la cata ▸" : "Esperando jugadores…";
    case "playing": {
      const n = state.wineIndex + 1;
      const fase = FASE_LABEL[state.fase];
      if (state.step === "quiz") return `Revelar ${fase.toLowerCase()} ▸`;
      // reveal → siguiente fase o, tras gamificación, podio parcial.
      if (state.fase === "gamificacion") return `Ver podio del vino ${n} ▸`;
      return `Siguiente fase (vino ${n}) ▸`;
    }
    case "wine_podium":
      return state.wineIndex >= WINE_COUNT - 1
        ? "Ver podio final 🏆"
        : `Catar vino ${state.wineIndex + 2} ▸`;
    case "final_podium":
      return "Cata terminada 🍷";
  }
}

function RoomPage() {
  const { code } = Route.useParams();
  const { mock } = Route.useSearch();
  const scenario: MockScenario | null =
    mock === undefined ? null : mock === "1" || mock === "" ? "reveal" : mock;

  const liveRoom = useRoomChannel({ code, role: "host" });
  const room = scenario ? mockRoom(scenario) : liveRoom;

  if (!room.configured) return <SetupNotice />;

  const { state, participants, advance, reset, connected, answers, answeredIds, finishState } = room;
  const players = participants.filter((p) => !p.isHost && !p.isViewer);

  const isLobby = state.stage === "lobby";
  const isFinal = state.stage === "final_podium";
  // En el podio final el botón reinicia la cata; en el resto avanza la máquina.
  const disabled = isLobby && players.length === 0;
  const onAdvance = isFinal ? reset : advance;
  const label = isFinal ? "Nueva cata ▸" : nextLabel(state, players.length > 0);

  const host = participants.find((p) => p.isHost);

  // El diálogo de cast se abre solo desde la píldora del header (no automático),
  // así no se mira en la TV cuando el anfitrión espeja la pestaña.
  const [castOpen, setCastOpen] = useState(false);
  // `casting` = el anfitrión ya ha abierto la vista TV al menos una vez en esta sesión.
  // Sirve sólo para tintar el icono de la píldora (no hay API de navegador fiable que
  // diga si la pestaña /tv sigue casteándose; lo tratamos como una intención).
  const [casting, setCasting] = useState(false);
  // Onboarding único de la píldora: aparece la primera vez en la sesión y se descarta
  // con "Entendido". Persistimos por sala para no molestar entre recargas.
  const castHintKey = `tastia:cast-hint:${code}`;
  const [showCastHint, setShowCastHint] = useState(false);
  useEffect(() => {
    if (scenario !== null) return;
    try {
      if (sessionStorage.getItem(castHintKey) !== "1") setShowCastHint(true);
    } catch {/* sessionStorage no disponible: mostramos igualmente. */}
  }, [castHintKey, scenario]);
  const dismissCastHint = () => {
    setShowCastHint(false);
    try {
      sessionStorage.setItem(castHintKey, "1");
    } catch {/* sin persistencia → reaparecerá tras un reload. */}
  };

  // El host NO reproduce clips: solo `/tv` los reproduce para evitar solapamiento
  // de audio cuando el anfitrión castea la pestaña a la TV.

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground play-bg bg-cover bg-center bg-no-repeat">


      {/* Top bar overlay — fondo ink/50 con texto en cream (light mode). */}
      <header className="fixed left-0 right-0 top-0 z-10 flex flex-wrap items-start justify-between gap-3 bg-ink/50 px-5 py-3 text-cream">
        <div className="flex items-center gap-3">
          <span className="serif text-xl font-bold leading-none">
            <span className="text-cream">Tast</span>
            <span className="text-white">IA</span>
          </span>
          <div className="inline-flex w-fit items-baseline gap-2 rounded-full bg-[color-mix(in_oklab,var(--foreground)_55%,transparent)] px-3 py-1 text-cream">
            <span className="font-sans text-sm font-normal">Sala</span>
            <span className="font-sans text-sm font-semibold tracking-widest">{code}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-cream">
          <div className="relative">
            <button
              type="button"
              onClick={() => setCastOpen(true)}
              aria-label="Enviar a TV"
              title="Enviar a TV"
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                casting
                  ? "text-[color:var(--wine)]"
                  : "text-white hover:bg-[color-mix(in_oklab,var(--foreground)_25%,transparent)]"
              }`}
            >
              <CastIcon className="h-6 w-6" strokeWidth={2} />
            </button>
            {showCastHint && (
              <div
                role="dialog"
                aria-label="Enviar a TV"
                className="absolute right-0 top-full z-20 mt-2 w-56 rounded bg-[color:var(--cream)] p-3 text-center shadow-lg"
              >
                {/* Pico apuntando a la píldora (arriba-derecha del tooltip). */}
                <span
                  aria-hidden="true"
                  className="absolute -top-1.5 right-3 h-3 w-3 rotate-45 bg-[color:var(--cream)]"
                />
                <p className="font-sans text-sm font-medium text-[color:var(--ink)]">Enviar a TV</p>
                <button
                  type="button"
                  onClick={dismissCastHint}
                  className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-[color:var(--wine)] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[color:var(--wine-deep)]"
                >
                  Entendido
                </button>
              </div>
            )}
          </div>
          <span className="flex items-center gap-2">
            {host && <HeaderAvatar name={host.name} photo={host.photo} />}
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${connected ? "bg-green-500" : "bg-amber-500"}`}
            />
            {connected ? "conectado" : "conectando…"}
          </span>
        </div>
      </header>

      {/* Tablero central: pregunta / reveal / podios. Overlay sobre el iframe, alineado abajo. */}
      <section className="fixed bottom-6 left-6 z-10 w-72">
        {state.stage === "playing" && (
          <HostQuiz state={state} players={players} answers={answers} answeredIds={answeredIds} />
        )}
        {state.stage === "wine_podium" && (
          <Podium
            title={`Podio parcial · tras el vino ${state.wineIndex + 1}/${WINE_COUNT}`}
            players={players}
            scores={state.scores}
          />
        )}
        {state.stage === "final_podium" && (
          <>
            <Podium title="Podio final 🏆" players={players} scores={state.scores} highlightTop />
            <FinishIndicator finishState={finishState} />
          </>
        )}
      </section>

      {/* Participantes — alineado a la derecha del viewport, abajo.
          En modo mock solo se muestra en `quiz` (en reveal/podio/final estorba al previsualizar). */}
      {(scenario === null || scenario === "quiz") && (
        <aside className="fixed bottom-6 right-6 z-10 w-[min(420px,40vw)]">
          <ParticipantPanel state={state} players={players} answeredIds={answeredIds} />
        </aside>
      )}

      {/* Control del anfitrión — flotante, centrado abajo. */}
      <div className="fixed bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center rounded-2xl border border-border/60 bg-card/95 p-4 shadow-lg backdrop-blur">
        <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-foreground/55">
          Control del anfitrión
        </p>
        <Button variant="wine" size="lg" disabled={disabled} onClick={onAdvance} className="h-14 rounded-lg">
          {label}
        </Button>
        <p className="mt-3 text-center text-xs text-foreground/55">
          Los jugadores se unen en <span className="font-semibold">tastia.app/play/{code}</span>
        </p>
      </div>

      <CastTvDialog
        code={code}
        open={castOpen}
        onOpenChange={setCastOpen}
        onCastStarted={() => setCasting(true)}
      />
    </div>
  );
}

/** Icono check (acierto / opción correcta). */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="5 12 10 17 19 7" />
    </svg>
  );
}

/** Icono X (fallo). */
function CrossIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

/** Icono guion (jugador que no respondió). */
function DashIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="6" y1="12" x2="18" y2="12" />
    </svg>
  );
}

/** Medalla SVG para los podios — 1.º oro, 2.º plata, 3.º bronce. */
function MedalIcon({ place }: { place: 1 | 2 | 3 }) {
  const color =
    place === 1
      ? "text-gold"
      : place === 2
        ? "text-[oklch(0.6401_0_0)]"
        : "text-[oklch(0.72_0.11_85.85)]";
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 shrink-0 ${color}`}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7 2 L9.5 9 L12 6.5 L14.5 9 L17 2 Z" opacity="0.75" />
      <circle cx="12" cy="16" r="6" />
      <text
        x="12"
        y="18.5"
        textAnchor="middle"
        fontSize="6.5"
        fontWeight="700"
        fill="white"
      >
        {place}
      </text>
    </svg>
  );
}

/** Avatar compacto para el top bar (foto o iniciales). */
function HeaderAvatar({ name, photo }: { name: string; photo?: string }) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name || "Anfitrión"}
        className="h-7 w-7 shrink-0 rounded-full border border-border/60 object-cover"
      />
    );
  }
  return (
    <span
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border/60 bg-secondary text-xs font-bold text-foreground/70"
      role="img"
      aria-label={name || "Anfitrión"}
    >
      {initials(name) || "·"}
    </span>
  );
}

/**
 * §5.6b-B — Indicador DISCRETO del guardado de la partida en `final_podium` (host). En modo demo
 * `finishState` queda en `"idle"` (no se llama a `session-finish`) → no muestra nada. Si la
 * persistencia falla, informa sin romper el podio (no hay reintento).
 */
function FinishIndicator({ finishState }: { finishState: "idle" | "saving" | "saved" | "error" }) {
  if (finishState === "idle") return null;
  const text =
    finishState === "saving"
      ? "Guardando resultado…"
      : finishState === "saved"
        ? "Resultado guardado"
        : "No se pudo guardar";
  const tone =
    finishState === "error"
      ? "text-red-600"
      : finishState === "saved"
        ? "text-green-600"
        : "text-foreground/55";
  return (
    <p className={`text-xs ${tone}`} role="status" aria-live="polite">
      {finishState === "saved" ? "✓ " : ""}
      {text}
    </p>
  );
}

/**
 * Sala — Pregunta y Revelación de la fase (§5.2/§5.6b-A). RENDERIZA lo que el host difunde en
 * `RoomState`: `state.activeQuestion` (enunciado + opciones, sin respuesta) y `state.reveal`
 * (opción correcta). Ya NO deriva con `getQuestion`. En `quiz` muestra el enunciado + opciones +
 * indicador de quién/cuántos han respondido; en `reveal` resalta la correcta (`reveal.correctOptionIndex`)
 * y marca ✓/✗ por jugador (no respondió = ✗). Si aún no hay `activeQuestion`, muestra "cargando…".
 */
export function HostQuiz({
  state,
  players,
  answers,
  answeredIds,
}: {
  state: RoomState;
  players: Participant[];
  answers: Record<string, number>;
  answeredIds: Set<string>;
}) {
  const isReveal = state.step === "reveal";
  const question = state.activeQuestion;
  const correctIndex = state.reveal?.correctOptionIndex;
  const answeredCount = players.filter((p) => answeredIds.has(p.id)).length;

  return (
    <div className="rounded-2xl border border-primary/40 bg-card/95 p-4 shadow-lg backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-foreground/55">
          Vino {state.wineIndex + 1}/{WINE_COUNT} · {FASE_LABEL[state.fase]}
        </p>
        {/* §5.3 — cuenta atrás cosmética, solo durante el quiz con deadline fijado. */}
        {!isReveal && state.deadline !== undefined && (
          <Countdown
            deadline={state.deadline}
            className="serif shrink-0 text-2xl font-bold tabular-nums text-primary"
          />
        )}
      </div>

      {question === undefined ? (
        <p className="serif mt-1 text-4xl font-bold text-foreground/50">Cargando pregunta…</p>
      ) : (
        <>
          <p className="serif mt-1 text-4xl font-bold">{question.prompt}</p>

          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {question.options.map((opt, i) => {
              const correct = isReveal && i === correctIndex;
              return (
                <li
                  key={i}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                    correct
                      ? "border-green-600 bg-green-600/15 font-semibold"
                      : "border-muted bg-white"
                  }`}
                >
                  <span>{opt}</span>
                  {correct && <CheckIcon className="h-6 w-6 text-green-600" />}
                </li>
              );
            })}
          </ul>

          {!isReveal ? (
            <p className="mt-3 text-sm text-foreground/70">
              Han respondido <span className="font-bold text-primary">{answeredCount}</span> de{" "}
              {players.length} jugador{players.length === 1 ? "" : "es"}.
            </p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm">
              {players.map((p) => {
                const ans = answers[p.id];
                const ok = ans !== undefined && correctIndex !== undefined && ans === correctIndex;
                // §5.5 — "+X" de ESTA Pregunta (solo a quien acierta); el panel/podios leen `scores`.
                const award = state.lastAward?.[p.id];
                return (
                  <li key={p.id} className="flex items-center justify-between">
                    <span className="font-medium">{p.name}</span>
                    <span className={`flex items-center gap-2 ${ok ? "text-green-600" : "text-primary"}`}>
                      {ok && award ? <span className="font-bold">+{award}</span> : null}
                      {ans === undefined ? (
                        <DashIcon className="h-6 w-6 text-foreground/55" />
                      ) : ok ? (
                        <CheckIcon className="h-6 w-6 text-green-600" />
                      ) : (
                        <CrossIcon className="h-6 w-6 text-red-500" />
                      )}
                    </span>
                  </li>
                );
              })}
              {players.length === 0 && <li className="text-foreground/55">Sin jugadores.</li>}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Panel de participantes (§5.11) — una tesela por jugador con foto/inicial + nombre + puntos.
 * Presente en TODAS las fases. Durante `quiz` aplica un halo derivado de `answeredIds`
 * (función pura de pertenencia): VERDE = ha respondido, ROJO/opaco = no. Fuera de `quiz`
 * (reveal/podios/lobby) el halo es neutro. En `wine_podium`/`final_podium` destaca al líder.
 */
function ParticipantPanel({
  state,
  players,
  answeredIds,
}: {
  state: RoomState;
  players: Participant[];
  answeredIds: Set<string>;
}) {
  // El halo de respuesta solo se pinta durante el quiz de un vino en juego.
  const quizPhase = state.stage === "playing" && state.step === "quiz";
  const isPodium = state.stage === "wine_podium" || state.stage === "final_podium";

  const ranked = players.slice().sort((a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0));
  // El/los líder(es) se destacan en los podios; con empate en lo más alto comparten puesto
  // (PRD), así que se marcan TODOS los que igualan el máximo (cuando el máximo > 0).
  const maxScore = ranked.length > 0 ? (state.scores[ranked[0].id] ?? 0) : 0;
  const leaderIds =
    isPodium && maxScore > 0
      ? new Set(players.filter((p) => (state.scores[p.id] ?? 0) === maxScore).map((p) => p.id))
      : new Set<string>();

  return (
    <div className="rounded-2xl border border-border/60 bg-card/95 p-4 shadow-lg backdrop-blur">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground/55">
        Participantes ({players.length})
      </p>
      {players.length === 0 ? (
        <p className="text-sm text-foreground/55">Nadie se ha unido todavía.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ranked.map((p) => (
            <ParticipantTile
              key={p.id}
              participant={p}
              score={state.scores[p.id] ?? 0}
              quizPhase={quizPhase}
              answered={answeredIds.has(p.id)}
              isLeader={leaderIds.has(p.id)}
              isFinal={state.stage === "final_podium"}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Tesela del panel: avatar + nombre + puntos, con halo de respuesta y resaltado de líder. */
function ParticipantTile({
  participant,
  score,
  quizPhase,
  answered,
  isLeader,
  isFinal,
}: {
  participant: Participant;
  score: number;
  quizPhase: boolean;
  answered: boolean;
  isLeader: boolean;
  isFinal: boolean;
}) {
  // Tarjeta por defecto: fondo blanco con borde --muted. El líder mantiene el oro (bg + borde).
  // En quiz: además se podrá superponer la capa olive con el check blanco al responder.
  const tileClass = isLeader
    ? "bg-gold/15 border-gold ring-2 ring-gold/60"
    : "border-muted bg-white text-ink";

  return (
    <li
      className={`relative flex flex-col items-center gap-2 overflow-hidden rounded-lg border p-3 text-center transition-all ${tileClass}`}
    >
      <Avatar name={participant.name} photo={participant.photo} inverted />
      <span className="line-clamp-1 w-full text-sm font-medium" title={participant.name}>
        {isLeader ? `${isFinal ? "🏆" : "🥇"} ` : ""}
        {participant.name}
      </span>
      <span className="serif text-sm font-bold text-primary">{score} pts</span>

      {quizPhase && answered && (
        <span
          className="pointer-events-none absolute inset-0 grid place-items-center bg-olive/80"
          aria-label="Respondió"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-10 w-10 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="5 12 10 17 19 7" />
          </svg>
        </span>
      )}
    </li>
  );
}

/** Avatar de la Sala: foto reducida si la hay, si no las iniciales del nombre (§5.11). */
function Avatar({
  name,
  photo,
  inverted,
}: {
  name: string;
  photo?: string;
  /** En quiz las iniciales se invierten: círculo --ink con texto blanco. */
  inverted?: boolean;
}) {
  const label = initials(name) || "·";
  if (photo) {
    return (
      <img
        src={photo}
        alt={name || "Participante"}
        className="h-14 w-14 shrink-0 rounded-full border border-border/60 object-cover"
      />
    );
  }
  const tone = inverted
    ? "bg-ink text-white"
    : "border border-border/60 bg-secondary text-foreground/70";
  return (
    <span
      className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-lg font-bold ${tone}`}
      role="img"
      aria-label={name || "Participante"}
    >
      {label}
    </span>
  );
}

/** Podio (parcial o final) calculado desde `scores`. */
export function Podium({
  title,
  players,
  scores,
  highlightTop = false,
}: {
  title: string;
  players: Participant[];
  scores: Record<string, number>;
  highlightTop?: boolean;
}) {
  const ranked = players.slice().sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
  // Empate en lo más alto = comparten puesto (PRD): se resaltan TODOS los que igualan el
  // máximo (cuando el máximo > 0), no solo el primero de la lista.
  const maxScore = ranked.length > 0 ? (scores[ranked[0].id] ?? 0) : 0;
  return (
    <div className="rounded-2xl border border-primary/40 bg-card/95 p-5 shadow-lg backdrop-blur">
      <p className="text-xs font-bold uppercase tracking-wider text-foreground/55">{title}</p>
      {ranked.length === 0 ? (
        <p className="mt-3 text-sm text-foreground/55">Sin jugadores.</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {ranked.map((p, idx) => (
            <li
              key={p.id}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                highlightTop && maxScore > 0 && (scores[p.id] ?? 0) === maxScore
                  ? "border-gold bg-gold text-ink"
                  : "border-muted bg-white"
              }`}
            >
              <span className="flex items-center gap-2 font-semibold">
                {idx < 3 ? <MedalIcon place={(idx + 1) as 1 | 2 | 3} /> : <span>{idx + 1}.</span>}
                {p.name}
              </span>
              <span className="serif font-bold">{scores[p.id] ?? 0} pts</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function SetupNotice() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
      <div className="max-w-md">
        <h1 className="serif text-3xl font-bold text-primary">Configura Supabase</h1>
        <p className="mt-3 text-sm text-foreground/70">
          Falta conectar Supabase. Copia <code>.env.example</code> a <code>.env</code> y rellena{" "}
          <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>, luego reinicia el dev server.
        </p>
      </div>
    </div>
  );
}

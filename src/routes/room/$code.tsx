import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useRoomChannel } from "@/lib/use-room-channel";
import {
  FASE_LABEL,
  isCorrect,
  STAGE_LABEL,
  WINE_COUNT,
  type Participant,
  type RoomState,
} from "@/lib/session";
import { getQuestion } from "@/lib/wines";

export const Route = createFileRoute("/room/$code")({
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
  const room = useRoomChannel({ code, role: "host" });

  if (!room.configured) return <SetupNotice />;

  const { state, participants, advance, reset, connected, answers, answeredIds } = room;
  const players = participants.filter((p) => !p.isHost);

  const isLobby = state.stage === "lobby";
  const isFinal = state.stage === "final_podium";
  // En el podio final el botón reinicia la cata; en el resto avanza la máquina.
  const disabled = isLobby && players.length === 0;
  const onAdvance = isFinal ? reset : advance;
  const label = isFinal ? "Nueva cata ▸" : nextLabel(state, players.length > 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-card px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="serif text-xl font-bold text-primary">Tastia · Sala</span>
          <code className="rounded-none bg-secondary px-2 py-1 text-sm font-bold tracking-widest">{code}</code>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${connected ? "bg-green-500" : "bg-amber-500"}`} />
            {connected ? "conectado" : "conectando…"}
          </span>
          <span className="font-semibold">{STAGE_LABEL[state.stage]}</span>
          {state.stage === "playing" && (
            <span className="text-foreground/70">
              Vino {state.wineIndex + 1}/{WINE_COUNT} · {FASE_LABEL[state.fase]}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Tablero: avatar + controles */}
        <section className="flex flex-col gap-4">
          {/* Slot del avatar del sommelier (iframe del proveedor: HeyGen / Anam / Tavus) */}
          <div className="relative aspect-video w-full overflow-hidden rounded-none border border-border/60 bg-ink">
            {/* TODO: sustituir por <iframe src={avatarUrl} ... /> del proveedor de avatar en tiempo real */}
            <div className="absolute inset-0 grid place-items-center text-center text-cream/80">
              <div>
                <p className="serif text-2xl font-bold">Sommelier-avatar</p>
                <p className="mt-1 text-sm text-cream/60">iframe del proveedor (próximamente)</p>
              </div>
            </div>
          </div>

          {/* Fase en juego: Pregunta (quiz) o Revelación (reveal) — §5.2. */}
          {state.stage === "playing" && (
            <HostQuiz state={state} players={players} answers={answers} answeredIds={answeredIds} />
          )}

          {/* Podio parcial tras cerrar el vino N */}
          {state.stage === "wine_podium" && (
            <Podium
              title={`Podio parcial · tras el vino ${state.wineIndex + 1}/${WINE_COUNT}`}
              players={players}
              scores={state.scores}
            />
          )}

          {/* Podio final */}
          {state.stage === "final_podium" && (
            <Podium title="Podio final 🏆" players={players} scores={state.scores} highlightTop />
          )}

          {/* Controles del anfitrión */}
          <div className="rounded-none border border-border/60 bg-card p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground/55">Control del anfitrión</p>
            <Button variant="wine" size="lg" disabled={disabled} onClick={onAdvance}>
              {label}
            </Button>
            <p className="mt-3 text-xs text-foreground/55">
              Los jugadores se unen en <span className="font-semibold">tastia.app/play/{code}</span>
            </p>
          </div>
        </section>

        {/* Marcador */}
        <aside className="flex flex-col gap-4">
          <div className="rounded-none border border-border/60 bg-card p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground/55">
              Jugadores ({players.length})
            </p>
            {players.length === 0 ? (
              <p className="text-sm text-foreground/55">Nadie se ha unido todavía.</p>
            ) : (
              <ul className="space-y-2">
                {players
                  .slice()
                  .sort((a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0))
                  .map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{p.name}</span>
                      <span className="serif font-bold text-primary">{state.scores[p.id] ?? 0} pts</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

/**
 * Sala — Pregunta y Revelación de la fase (§5.2). Deriva la Pregunta de forma determinista
 * con `getQuestion(wineIndex, fase)` (mismo orden que el Companion). En `quiz` muestra el
 * enunciado + 4 opciones + indicador de quién/cuántos han respondido; en `reveal` resalta la
 * opción correcta y marca ✓/✗ por jugador (no respondió = ✗).
 */
function HostQuiz({
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
  const q = getQuestion(state.wineIndex, state.fase);
  const isReveal = state.step === "reveal";
  const answeredCount = players.filter((p) => answeredIds.has(p.id)).length;

  return (
    <div className="rounded-none border border-primary/40 bg-card p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-foreground/55">
        Vino {state.wineIndex + 1}/{WINE_COUNT} · {FASE_LABEL[state.fase]} ·{" "}
        {isReveal ? "Revelación" : "Pregunta"}
      </p>
      <p className="serif mt-1 text-2xl font-bold">{q.prompt}</p>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {q.options.map((opt, i) => {
          const correct = isReveal && i === q.correctIndex;
          return (
            <li
              key={i}
              className={`flex items-center justify-between rounded-none border px-3 py-2 text-sm ${
                correct
                  ? "border-green-600 bg-green-600/15 font-semibold"
                  : "border-border/60 bg-secondary/40"
              }`}
            >
              <span>{opt}</span>
              {correct && <span className="text-green-600">✓ correcta</span>}
            </li>
          );
        })}
      </ul>

      {!isReveal ? (
        <p className="mt-3 text-sm text-foreground/70">
          Han respondido <span className="font-bold text-primary">{answeredCount}</span> de{" "}
          {players.length} jugador{players.length === 1 ? "" : "es"}.
          {players.length > 0 && answeredCount > 0 && (
            <span className="ml-1 text-foreground/55">
              ({players.filter((p) => answeredIds.has(p.id)).map((p) => p.name).join(", ")})
            </span>
          )}
        </p>
      ) : (
        <ul className="mt-3 space-y-1 text-sm">
          {players.map((p) => {
            const ans = answers[p.id];
            const ok = ans !== undefined && isCorrect(ans, q);
            return (
              <li key={p.id} className="flex items-center justify-between">
                <span className="font-medium">{p.name}</span>
                <span className={ok ? "text-green-600" : "text-primary"}>
                  {ans === undefined ? "✗ no respondió" : ok ? "✓ acertó" : "✗ falló"}
                </span>
              </li>
            );
          })}
          {players.length === 0 && <li className="text-foreground/55">Sin jugadores.</li>}
        </ul>
      )}
    </div>
  );
}

/** Podio (parcial o final) calculado desde `scores`. */
function Podium({
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
  return (
    <div className="rounded-none border border-primary/40 bg-card p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-foreground/55">{title}</p>
      {ranked.length === 0 ? (
        <p className="mt-3 text-sm text-foreground/55">Sin jugadores.</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {ranked.map((p, idx) => (
            <li
              key={p.id}
              className={`flex items-center justify-between rounded-none px-3 py-2 ${
                highlightTop && idx === 0 ? "bg-gold text-ink" : "bg-secondary/50"
              }`}
            >
              <span className="font-semibold">
                {["🥇", "🥈", "🥉"][idx] ?? `${idx + 1}.`} {p.name}
              </span>
              <span className="serif font-bold">{scores[p.id] ?? 0} pts</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function SetupNotice() {
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

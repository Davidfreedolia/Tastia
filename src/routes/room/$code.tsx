import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useRoomChannel } from "@/lib/use-room-channel";
import { PHASE_LABEL, WINE_COUNT } from "@/lib/session";

export const Route = createFileRoute("/room/$code")({
  component: RoomPage,
});

function RoomPage() {
  const { code } = Route.useParams();
  const room = useRoomChannel({ code, role: "host" });

  if (!room.configured) return <SetupNotice />;

  const { state, participants, answers, updateState, revealCurrentWine, connected } = room;
  const players = participants.filter((p) => !p.isHost);

  const i = state.currentWineIndex;
  const isLastWine = i >= WINE_COUNT - 1;

  // Single guided "next step" button for the host (lobby → 4 vinos → podio).
  const step: { label: string; disabled?: boolean; action: () => void } =
    state.phase === "lobby"
      ? {
          label: players.length ? "Empezar la cata ▸" : "Esperando jugadores…",
          disabled: players.length === 0,
          action: () => updateState({ phase: "intro" }),
        }
      : state.phase === "intro"
        ? { label: "Catar vino 1 ▸", action: () => updateState({ phase: "tasting", currentWineIndex: 0 }) }
        : state.phase === "tasting"
          ? { label: `Revelar vino ${i + 1} + puntos ▸`, action: revealCurrentWine }
          : state.phase === "reveal"
            ? isLastWine
              ? { label: "Ver podio final 🏆", action: () => updateState({ phase: "finished" }) }
              : {
                  label: `Catar vino ${i + 2} ▸`,
                  action: () => updateState({ phase: "tasting", currentWineIndex: i + 1 }),
                }
            : {
                label: "Reiniciar cata",
                action: () =>
                  updateState({ phase: "lobby", currentWineIndex: 0, scores: {}, lastReveal: undefined }),
              };

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
          <span className="font-semibold">{PHASE_LABEL[state.phase]}</span>
          {state.phase === "tasting" && (
            <span className="text-foreground/70">Vino {state.currentWineIndex + 1}/{WINE_COUNT}</span>
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

          {state.phase === "reveal" && state.lastReveal && (
            <div className="rounded-none border border-primary/40 bg-card p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground/55">
                Vino {state.lastReveal.wineIndex + 1} revelado
              </p>
              <p className="serif text-2xl font-bold mt-1">{state.lastReveal.wine.name}</p>
              <p className="text-sm text-foreground/70">
                {state.lastReveal.wine.bodega} · {state.lastReveal.wine.region} ·{" "}
                {state.lastReveal.wine.grape} · {state.lastReveal.wine.vintage} ·{" "}
                {state.lastReveal.wine.priceRange}
              </p>
              <p className="mt-2 text-sm italic text-foreground/60">{state.lastReveal.wine.note}</p>
            </div>
          )}

          {state.phase === "finished" && (
            <div className="rounded-none border border-primary/40 bg-card p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground/55">Podio final 🏆</p>
              <ol className="mt-3 space-y-2">
                {players
                  .slice()
                  .sort((a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0))
                  .map((p, idx) => (
                    <li
                      key={p.id}
                      className={`flex items-center justify-between rounded-none px-3 py-2 ${idx === 0 ? "bg-gold text-ink" : "bg-secondary/50"}`}
                    >
                      <span className="font-semibold">
                        {["🥇", "🥈", "🥉"][idx] ?? `${idx + 1}.`} {p.name}
                      </span>
                      <span className="serif font-bold">{state.scores[p.id] ?? 0} pts</span>
                    </li>
                  ))}
              </ol>
            </div>
          )}

          {/* Controles del anfitrión */}
          <div className="rounded-none border border-border/60 bg-card p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground/55">Control del anfitrión</p>
            <Button variant="wine" size="lg" disabled={step.disabled} onClick={step.action}>
              {step.label}
            </Button>
            <p className="mt-3 text-xs text-foreground/55">
              Los jugadores se unen en <span className="font-semibold">tastia.app/play/{code}</span>
            </p>
          </div>
        </section>

        {/* Marcador + apuestas */}
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

          <div className="rounded-none border border-border/60 bg-card p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground/55">
              Apuestas · vino {state.currentWineIndex + 1}
            </p>
            {answers.length === 0 ? (
              <p className="text-sm text-foreground/55">Sin apuestas todavía.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {answers.map((a) => (
                  <li key={a.playerId} className="rounded-none bg-secondary/50 px-3 py-2">
                    <span className="font-semibold">{a.name}: </span>
                    <span className="text-foreground/75">
                      {[a.guess.grape, a.guess.region, a.guess.priceRange, a.guess.vintage]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </span>
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

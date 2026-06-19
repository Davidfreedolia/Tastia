import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRoomChannel } from "@/lib/use-room-channel";
import { FASE_LABEL, STAGE_LABEL, WINE_COUNT, type Participant, type RoomState } from "@/lib/session";
import { supabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/play/$code")({
  component: PlayPage,
});

function PlayPage() {
  const { code } = Route.useParams();
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);

  if (!supabaseConfigured) return <SetupNotice />;

  if (!joined) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) setJoined(true);
          }}
          className="w-full max-w-sm rounded-none border border-border/60 bg-card p-6 text-center"
        >
          <h1 className="serif text-2xl font-bold text-primary">Únete a la cata</h1>
          <p className="mt-1 text-sm text-foreground/60">Sala {code}</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            maxLength={24}
            className="mt-5 w-full rounded-none border border-border bg-background px-3 py-3 text-center text-lg outline-none focus:border-primary"
          />
          <Button type="submit" variant="wine" size="lg" className="mt-4 w-full" disabled={!name.trim()}>
            Entrar
          </Button>
        </form>
      </div>
    );
  }

  return <Companion code={code} name={name.trim()} />;
}

function Companion({ code, name }: { code: string; name: string }) {
  const room = useRoomChannel({ code, role: "player", name });
  const { state, connected, participants, meId } = room;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border/60 bg-card px-4 py-3">
        <span className="serif font-bold text-primary">Tastia</span>
        <span className="flex items-center gap-2 text-xs text-foreground/60">
          <span className={`inline-block h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-amber-500"}`} />
          {name}
        </span>
      </header>

      <main className="mx-auto max-w-md px-4 py-6">
        <div className="rounded-none border border-border/60 bg-card p-3 text-center text-sm">
          <span className="font-semibold">{STAGE_LABEL[state.stage]}</span>
          {state.stage === "playing" && (
            <span className="text-foreground/60">
              {" "}
              · Vino {state.wineIndex + 1}/{WINE_COUNT} · {FASE_LABEL[state.fase]}
            </span>
          )}
        </div>

        <CompanionBody state={state} participants={participants} meId={meId} />

        {participants.length > 0 && (
          <div className="mt-6 rounded-none border border-border/60 bg-card p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground/55">En la sala</p>
            <ul className="flex flex-wrap gap-2 text-xs">
              {participants.map((p) => (
                <li key={p.id} className="rounded-none bg-secondary/60 px-2 py-1">
                  {p.isHost ? "🖥️ " : ""}
                  {p.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

/** Refleja `(stage, fase, step)` con placeholders (el quiz real = §5.2). */
function CompanionBody({
  state,
  participants,
  meId,
}: {
  state: RoomState;
  participants: Participant[];
  meId: string;
}) {
  if (state.stage === "lobby") {
    return <Msg>Estás dentro. Esperando a que el anfitrión empiece la cata…</Msg>;
  }

  if (state.stage === "playing") {
    if (state.step === "quiz") {
      return (
        <div className="mt-4 rounded-none border border-primary/40 bg-card p-4 text-center">
          <p className="text-xs uppercase tracking-wider text-foreground/55">
            Vino {state.wineIndex + 1} · {FASE_LABEL[state.fase]}
          </p>
          <p className="serif mt-1 text-xl font-bold">Atención a la pantalla</p>
          <p className="mt-2 text-sm text-foreground/70">
            Aquí aparecerá la pregunta de {FASE_LABEL[state.fase].toLowerCase()} y sus opciones (próximamente).
          </p>
        </div>
      );
    }
    return (
      <div className="mt-4 rounded-none border border-primary/40 bg-card p-4 text-center">
        <p className="text-xs uppercase tracking-wider text-foreground/55">
          Vino {state.wineIndex + 1} · {FASE_LABEL[state.fase]}
        </p>
        <p className="serif mt-1 text-xl font-bold">Revelación</p>
        <p className="mt-2 text-sm text-foreground/70">
          Mira la pantalla para la respuesta y los puntos (próximamente).
        </p>
      </div>
    );
  }

  if (state.stage === "wine_podium") {
    return (
      <CompanionScore
        title={`Podio parcial · vino ${state.wineIndex + 1}/${WINE_COUNT}`}
        state={state}
        participants={participants}
        meId={meId}
      />
    );
  }

  // final_podium
  return (
    <CompanionScore title="¡Cata terminada! 🍷" state={state} participants={participants} meId={meId} final />
  );
}

/** Resumen de puntos del jugador + su puesto (parcial o final). */
function CompanionScore({
  title,
  state,
  participants,
  meId,
  final = false,
}: {
  title: string;
  state: RoomState;
  participants: Participant[];
  meId: string;
  final?: boolean;
}) {
  const ranked = participants
    .filter((p) => !p.isHost)
    .slice()
    .sort((a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0));
  const rank = ranked.findIndex((p) => p.id === meId) + 1;

  return (
    <div className="mt-4 rounded-none border border-primary/40 bg-card p-5 text-center">
      <p className="serif text-2xl font-bold">{title}</p>
      <p className="mt-3 serif text-4xl font-bold text-primary">{state.scores[meId] ?? 0} pts</p>
      {rank > 0 && (
        <p className="mt-1 text-sm text-foreground/70">
          {final
            ? (["🥇 ¡Ganas!", "🥈 2º puesto", "🥉 3er puesto"][rank - 1] ?? `Puesto ${rank} de ${ranked.length}`)
            : `Vas ${rank}º de ${ranked.length}`}
        </p>
      )}
    </div>
  );
}

function Msg({ children }: { children: React.ReactNode }) {
  return <p className="mt-6 text-center text-foreground/70">{children}</p>;
}

function SetupNotice() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
      <div className="max-w-md">
        <h1 className="serif text-3xl font-bold text-primary">Sala no disponible</h1>
        <p className="mt-3 text-sm text-foreground/70">La conexión en tiempo real aún no está configurada.</p>
      </div>
    </div>
  );
}

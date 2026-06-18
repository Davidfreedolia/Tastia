import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRoomChannel } from "@/lib/use-room-channel";
import { PHASE_LABEL, WINE_COUNT, type Guess } from "@/lib/session";
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
  const { state, connected, submitAnswer, participants, meId } = room;
  const [guess, setGuess] = useState<Guess>({});
  const [sent, setSent] = useState(false);

  const field = (key: keyof Guess, label: string, placeholder: string) => (
    <label className="block text-left">
      <span className="text-xs font-semibold uppercase tracking-wider text-foreground/55">{label}</span>
      <input
        value={guess[key] ?? ""}
        onChange={(e) => {
          setGuess((g) => ({ ...g, [key]: e.target.value }));
          setSent(false);
        }}
        placeholder={placeholder}
        className="mt-1 w-full rounded-none border border-border bg-background px-3 py-2.5 outline-none focus:border-primary"
      />
    </label>
  );

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
          <span className="font-semibold">{PHASE_LABEL[state.phase]}</span>
          {state.phase === "tasting" && (
            <span className="text-foreground/60"> · Vino {state.currentWineIndex + 1}/{WINE_COUNT}</span>
          )}
        </div>

        {state.phase === "lobby" && (
          <Msg>Estás dentro. Esperando a que el anfitrión empiece la cata…</Msg>
        )}
        {state.phase === "intro" && <Msg>Mira la pantalla: el sommelier os da la bienvenida.</Msg>}

        {state.phase === "tasting" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitAnswer(guess);
              setSent(true);
            }}
            className="mt-4 space-y-3"
          >
            <p className="text-sm text-foreground/70">¿Qué crees que es el vino {state.currentWineIndex + 1}?</p>
            {field("grape", "Variedad", "Tempranillo, Garnacha…")}
            {field("region", "D.O.", "Rioja, Priorat…")}
            {field("priceRange", "Precio", "10-25€, 25-40€…")}
            {field("vintage", "Añada", "2019, 2021…")}
            <Button type="submit" variant="wine" size="lg" className="w-full">
              {sent ? "Apuesta enviada ✓ (editar y reenviar)" : "Enviar apuesta"}
            </Button>
          </form>
        )}

        {(state.phase === "reveal" || state.phase === "scoring") &&
          (state.lastReveal ? (
            <div className="mt-4 rounded-none border border-primary/40 bg-card p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-foreground/55">
                Vino {state.lastReveal.wineIndex + 1}
              </p>
              <p className="serif text-xl font-bold">{state.lastReveal.wine.name}</p>
              <p className="text-sm text-foreground/70">
                {state.lastReveal.wine.grape} · {state.lastReveal.wine.region} ·{" "}
                {state.lastReveal.wine.vintage}
              </p>
              <p className="mt-3 serif text-3xl font-bold text-primary">
                +{state.lastReveal.awarded[meId] ?? 0} pts
              </p>
              <p className="text-xs text-foreground/60">Total: {state.scores[meId] ?? 0} pts</p>
            </div>
          ) : (
            <Msg>Mira la pantalla para la revelación y los puntos.</Msg>
          ))}
        {state.phase === "finished" && <Msg>¡Cata terminada! Mira el podio en la pantalla. 🍷</Msg>}

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

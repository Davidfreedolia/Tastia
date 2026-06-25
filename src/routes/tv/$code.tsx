import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useRoomChannel } from "@/lib/use-room-channel";
import { HostQuiz, Podium, SetupNotice } from "@/routes/room/$code";
import { WINE_COUNT } from "@/lib/session";
import { clipKey, clipUrlFor } from "@/lib/clip-map";

export const Route = createFileRoute("/tv/$code")({
  component: TvPage,
});

/**
 * Vista cinemática para TV. Se conecta al mismo canal Realtime que la sala como
 * `viewer` (no juega, no aparece en la lista de participantes) y refleja el estado
 * autoritativo difundido por el host. Pensada para abrirse en un segundo dispositivo
 * (Chromecast con la pestaña enviada, Apple TV/Fire TV con navegador, o segundo
 * monitor en pantalla completa) y eliminar la latencia del tab-mirror.
 */
function TvPage() {
  const { code } = Route.useParams();
  const room = useRoomChannel({ code, role: "viewer" });

  if (!room.configured) return <SetupNotice />;

  const { state, participants, answers, answeredIds } = room;
  const players = participants.filter((p) => !p.isHost && !p.isViewer);

  const stageKey = clipKey(state);
  const clipUrl = clipUrlFor(state);

  // Cuando el clip termina ocultamos el `<video>` y dejamos asomar el `play-bg`
  // con un mensaje de espera. Se reinicia en cada cambio de fase (al cambiar
  // `stageKey` el `<video>` se remonta y arrancamos de nuevo en false).
  const [clipEnded, setClipEnded] = useState(false);
  useEffect(() => {
    setClipEnded(false);
  }, [stageKey]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground play-bg bg-cover bg-center bg-no-repeat">
      {/* Avatar del sommelier — vídeo a pantalla completa, igual que la sala. Si
          aún no hay clip cableado o ya ha terminado, dejamos que asome el fondo `play-bg`. */}
      {clipUrl && !clipEnded && (
        <video
          key={stageKey}
          className="fixed inset-0 z-0 h-full w-full border-0 bg-ink object-cover"
          src={clipUrl}
          autoPlay
          playsInline
          onEnded={() => setClipEnded(true)}
        />
      )}

      {clipUrl && clipEnded && (
        <p className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center px-12 text-center serif text-3xl font-medium leading-snug text-white">
          Te dejamos unos instantes para que disfrutes del vino, ahora continuamos.
        </p>
      )}

      {/* Top bar minimalista — sólo branding y código de sala, sin controles. */}
      <header className="fixed left-0 right-0 top-0 z-10 flex items-center justify-between gap-3 bg-ink/50 px-8 py-4 text-cream">
        <span className="serif text-2xl font-bold leading-none">
          <span className="text-cream">Tast</span>
          <span className="text-white">IA</span>
        </span>
        <div className="inline-flex items-baseline gap-2 rounded-full bg-[color-mix(in_oklab,var(--foreground)_55%,transparent)] px-4 py-1.5 text-cream">
          <span className="font-sans text-base font-normal">Sala</span>
          <span className="font-sans text-base font-semibold tracking-widest">{code}</span>
        </div>
      </header>

      {/* Tablero central a escala TV: ampliado respecto a la sala para legibilidad
          a distancia. Reutiliza los componentes del host para no duplicar UI. */}
      <section className="fixed bottom-10 left-1/2 z-10 w-[min(56vw,820px)] -translate-x-1/2 scale-110">
        {state.stage === "lobby" && (
          <div className="rounded-2xl border border-border/60 bg-card/95 px-8 py-6 text-center shadow-lg backdrop-blur">
            <p className="serif text-3xl font-semibold text-[color:var(--wine)]">
              Esperando a que empiece la cata…
            </p>
            <p className="mt-2 text-base text-foreground/60">
              Únete en <span className="font-semibold">tastia.app/play/{code}</span>
            </p>
          </div>
        )}
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
          <Podium title="Podio final 🏆" players={players} scores={state.scores} highlightTop />
        )}
      </section>
    </div>
  );
}

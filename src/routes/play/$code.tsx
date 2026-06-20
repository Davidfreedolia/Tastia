import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/Countdown";
import { useRoomChannel } from "@/lib/use-room-channel";
import {
  FASE_LABEL,
  initials,
  isCorrect,
  STAGE_LABEL,
  WINE_COUNT,
  type Participant,
  type RoomState,
} from "@/lib/session";
import { getQuestion } from "@/lib/wines";
import { downscaleImage } from "@/lib/photo";
import { supabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/play/$code")({
  component: PlayPage,
});

function PlayPage() {
  const { code } = Route.useParams();
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  // §5.11 — foto opcional: data-URL reducido (~128px JPEG) o null (avatar de iniciales).
  const [photo, setPhoto] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!supabaseConfigured) return <SetupNotice />;

  if (!joined) {
    const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = ""; // permite re-elegir el mismo archivo.
      if (!file) return;
      setProcessing(true);
      // Si la conversión falla o la imagen es ilegible, se entra SIN foto (avatar).
      const reduced = await downscaleImage(file).catch(() => null);
      setPhoto(reduced);
      setProcessing(false);
    };

    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // Solo unir si hay nombre y la foto ya no se está procesando: evita que Enter
            // sortee el botón deshabilitado y entre con la foto a medio resolver.
            if (name.trim() && !processing) setJoined(true);
          }}
          className="w-full max-w-sm rounded-none border border-border/60 bg-card p-6 text-center"
        >
          <h1 className="serif text-2xl font-bold text-primary">Únete a la cata</h1>
          <p className="mt-1 text-sm text-foreground/60">Sala {code}</p>

          {/* §5.11 — avatar opcional: foto reducida o iniciales del nombre. */}
          <div className="mt-5 flex flex-col items-center gap-3">
            <Avatar name={name} photo={photo} size="lg" />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={onPickPhoto}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outlineWine"
                size="sm"
                disabled={processing}
                onClick={() => fileRef.current?.click()}
              >
                {processing ? "Procesando…" : photo ? "Cambiar foto" : "Añadir foto"}
              </Button>
              {photo && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setPhoto(null)}>
                  Sin foto
                </Button>
              )}
            </div>
            <p className="text-xs text-foreground/50">La foto es opcional. Sin ella se usa tu inicial.</p>
          </div>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            maxLength={24}
            className="mt-5 w-full rounded-none border border-border bg-background px-3 py-3 text-center text-lg outline-none focus:border-primary"
          />
          <Button type="submit" variant="wine" size="lg" className="mt-4 w-full" disabled={!name.trim() || processing}>
            Entrar
          </Button>
        </form>
      </div>
    );
  }

  return <Companion code={code} name={name.trim()} photo={photo ?? undefined} />;
}

/** Avatar reutilizable: foto reducida si la hay, si no las iniciales del nombre (§5.11). */
function Avatar({
  name,
  photo,
  size = "md",
}: {
  name: string;
  photo?: string | null;
  size?: "md" | "lg";
}) {
  const dim = size === "lg" ? "h-20 w-20 text-xl" : "h-10 w-10 text-sm";
  const label = initials(name) || "·";
  if (photo) {
    return (
      <img
        src={photo}
        alt={name || "Participante"}
        className={`${dim} shrink-0 rounded-full border border-border/60 object-cover`}
      />
    );
  }
  return (
    <span
      className={`${dim} grid shrink-0 place-items-center rounded-full border border-border/60 bg-secondary font-bold text-foreground/70`}
      role="img"
      aria-label={name || "Participante"}
    >
      {label}
    </span>
  );
}

function Companion({ code, name, photo }: { code: string; name: string; photo?: string }) {
  const room = useRoomChannel({ code, role: "player", name, photo });
  const { state, connected, participants, meId, submitAnswer, myAnswer } = room;

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

        <CompanionBody
          state={state}
          participants={participants}
          meId={meId}
          submitAnswer={submitAnswer}
          myAnswer={myAnswer}
        />

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

/** Refleja `(stage, fase, step)`; en `playing` pinta la Pregunta/Revelación real (§5.2). */
function CompanionBody({
  state,
  participants,
  meId,
  submitAnswer,
  myAnswer,
}: {
  state: RoomState;
  participants: Participant[];
  meId: string;
  submitAnswer: (optionIndex: number) => void;
  myAnswer: number | null;
}) {
  if (state.stage === "lobby") {
    return <Msg>Estás dentro. Esperando a que el anfitrión empiece la cata…</Msg>;
  }

  if (state.stage === "playing") {
    return <PlayerQuiz state={state} submitAnswer={submitAnswer} myAnswer={myAnswer} meId={meId} />;
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

/**
 * Companion — Pregunta y Revelación de la fase (§5.2). Deriva la Pregunta de forma
 * determinista con `getQuestion(wineIndex, fase)` (mismo orden que la Sala). En `quiz`
 * muestra 4 opciones pulsables (resalta la elegida, permite cambiar mientras está abierto);
 * en `reveal` resalta la correcta y muestra tu ✓/✗ (sin opción = ✗). El jugador solo
 * responde: nunca avanza la máquina de estados.
 */
function PlayerQuiz({
  state,
  submitAnswer,
  myAnswer,
  meId,
}: {
  state: RoomState;
  submitAnswer: (optionIndex: number) => void;
  myAnswer: number | null;
  meId: string;
}) {
  const q = getQuestion(state.wineIndex, state.fase);
  const isReveal = state.step === "reveal";
  const gotIt = myAnswer !== null && isCorrect(myAnswer, q);
  // §5.5 — tu "+X" de esta Pregunta (solo si has acertado; en reveal).
  const myAward = state.lastAward?.[meId];

  return (
    <div className="mt-4 rounded-none border border-primary/40 bg-card p-4">
      <p className="text-center text-xs uppercase tracking-wider text-foreground/55">
        Vino {state.wineIndex + 1} · {FASE_LABEL[state.fase]}
      </p>
      {/* §5.3 — cuenta atrás cosmética, solo durante el quiz con deadline fijado. */}
      {!isReveal && state.deadline !== undefined && (
        <p className="mt-1 text-center">
          <Countdown
            deadline={state.deadline}
            className="serif text-3xl font-bold tabular-nums text-primary"
          />
        </p>
      )}
      <p className="serif mt-1 text-center text-lg font-bold">{q.prompt}</p>

      <div className="mt-4 grid gap-2">
        {q.options.map((opt, i) => {
          const selected = myAnswer === i;
          const correct = isReveal && i === q.correctIndex;
          // En reveal: verde la correcta, rojo tu elección si falló; selección normal en quiz.
          const cls = isReveal
            ? correct
              ? "border-green-600 bg-green-600/15 font-semibold"
              : selected
                ? "border-primary bg-primary/15"
                : "border-border/60 bg-secondary/30"
            : selected
              ? "border-primary bg-primary/15 font-semibold"
              : "border-border/70 bg-background hover:border-primary/60";
          return (
            <button
              key={i}
              type="button"
              disabled={isReveal}
              onClick={() => submitAnswer(i)}
              className={`flex items-center justify-between rounded-none border px-4 py-3 text-left text-base transition-colors disabled:cursor-default ${cls}`}
            >
              <span>{opt}</span>
              {isReveal && correct && <span className="text-green-600">✓</span>}
              {isReveal && !correct && selected && <span className="text-primary">✗</span>}
            </button>
          );
        })}
      </div>

      {!isReveal ? (
        <p className="mt-3 text-center text-sm text-foreground/60">
          {myAnswer === null ? "Toca tu respuesta (puedes cambiarla)." : "Respuesta enviada ✓ — puedes cambiarla."}
        </p>
      ) : (
        <p className="mt-3 text-center text-sm font-semibold">
          {myAnswer === null ? (
            <span className="text-primary">✗ No respondiste</span>
          ) : gotIt ? (
            <span className="text-green-600">
              ✓ ¡Acertaste!{myAward ? <span className="ml-1 font-bold">+{myAward}</span> : null}
            </span>
          ) : (
            <span className="text-primary">✗ Fallaste</span>
          )}
        </p>
      )}
    </div>
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

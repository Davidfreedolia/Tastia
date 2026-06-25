import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { Countdown } from "@/components/Countdown";
import { useRoomChannel } from "@/lib/use-room-channel";
import { useMockPlayerRoom, type MockPlayerScenario } from "@/lib/mock-room";
import {
  FASE_LABEL,
  initials,
  STAGE_LABEL,
  WINE_COUNT,
  type Participant,
  type RoomState,
} from "@/lib/session";
import { downscaleImage } from "@/lib/photo";
import { supabaseConfigured } from "@/lib/supabase";

// Fondo común a TODO el flujo del jugador: clase `play-bg` definida en styles.css
// (product-friends.jpg como cover). Se aplica en welcome/lobby/inner screens.
const PLAY_BG = "play-bg bg-cover bg-center bg-no-repeat";

// `?mock=lobby|quiz|reveal|wine-podium|final` (o `?mock=1` → quiz) previsualiza
// la app del jugador sin Supabase ni anfitrión real: salta el join y pinta el
// Companion con datos demo. Útil para iterar la UX sin esperar a que arranque la sala.
const MOCK_PLAYER_SCENARIO = z.enum(["lobby", "quiz", "reveal", "wine-podium", "final"]);
const mockSearch = z
  .object({ mock: z.union([MOCK_PLAYER_SCENARIO, z.literal("1"), z.literal("")]).optional() })
  .parse;

export const Route = createFileRoute("/play/$code")({
  validateSearch: (s) => mockSearch(s),
  component: PlayPage,
});

function PlayPage() {
  const { code } = Route.useParams();
  const { mock } = Route.useSearch();
  const scenario: MockPlayerScenario | null =
    mock === undefined ? null : mock === "1" || mock === "" ? "quiz" : mock;

  if (scenario) return <MockCompanion code={code} scenario={scenario} />;
  // Persistimos la identidad del jugador por sala en sessionStorage para que un reload
  // no le obligue a registrarse de nuevo. La rehidratación va dentro de un useEffect
  // para no romper el match SSR/CSR (sessionStorage solo existe en el cliente).
  const sessionKey = `tastia:play:${code}`;
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  // §5.11 — foto opcional: data-URL reducido (~128px JPEG) o null (avatar de iniciales).
  const [photo, setPhoto] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(sessionKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { name?: string; photo?: string | null };
      if (saved.name) {
        setName(saved.name);
        setPhoto(saved.photo ?? null);
        setJoined(true);
      }
    } catch {/* sessionStorage no disponible/corrupto: seguimos sin restaurar. */}
  }, [sessionKey]);

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
      <div className={`grid min-h-screen place-items-center bg-background px-6 ${PLAY_BG}`}>
        <div className="flex w-full max-w-sm flex-col items-center">
          {/* Logo TastIA — mismo del landing, 5% más grande, sobre el formulario. */}
          <div className="play-welcome-logo mb-[5vh] text-cream">
            <Logo light />
          </div>
          <form
          onSubmit={(e) => {
            e.preventDefault();
            // Solo unir si hay nombre y la foto ya no se está procesando: evita que Enter
            // sortee el botón deshabilitado y entre con la foto a medio resolver.
            if (name.trim() && !processing) {
              try {
                sessionStorage.setItem(sessionKey, JSON.stringify({ name: name.trim(), photo }));
              } catch {/* sessionStorage no disponible (modo incógnito estricto): seguimos sin persistir. */}
              setJoined(true);
            }
          }}
          className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-6 text-center"
        >
          <h1 className="serif text-2xl font-bold text-ink">Únete a la cata</h1>
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
                className="h-6 rounded-lg"
              >
                {processing ? "Procesando…" : photo ? "Cambiar foto" : "Añadir foto"}
              </Button>
              {photo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPhoto(null)}
                  aria-label="Quitar foto"
                  className="h-6 w-6 rounded-lg p-0"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            maxLength={24}
            className="mt-5 w-full rounded-[8px] border border-border bg-[oklch(1_0_0)] px-3 py-3 text-left text-lg outline-none placeholder:text-left focus:border-primary"
          />
          <Button
            type="submit"
            variant="wine"
            size="lg"
            className="mt-4 h-14 w-full rounded-lg"
            disabled={!name.trim() || processing}
          >
            Entrar
          </Button>
        </form>
        </div>
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
  const label = initials(name) || "A";
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
  return <CompanionView code={code} room={room} />;
}

/** Variante mock (?mock=…): salta el join y pinta el Companion con datos demo. */
function MockCompanion({ code, scenario }: { code: string; scenario: MockPlayerScenario }) {
  const room = useMockPlayerRoom(scenario);
  return <CompanionView code={code} room={room} />;
}

/** UI compartida entre el Companion real (Supabase) y el de previsualización (mock). */
function CompanionView({
  code,
  room,
}: {
  code: string;
  room: {
    state: RoomState;
    connected: boolean;
    participants: Participant[];
    meId: string;
    submitAnswer: (i: number) => void;
    myAnswer: number | null;
  };
}) {
  const { state, participants, meId, submitAnswer, myAnswer } = room;
  const players = participants.filter((p) => !p.isHost && !p.isViewer);

  return (
    <div className={`min-h-screen bg-background text-foreground ${PLAY_BG}`}>
      {/* Top bar — mismo lenguaje visual que /room/$code.tsx (fixed, ink/50, cream).
          Logo y chip "Sala" agrupados a la izquierda; etiqueta de etapa centrada. */}
      <header className="fixed left-0 right-0 top-0 z-10 flex items-center justify-between gap-3 bg-ink/50 px-5 py-3 text-cream">
        <div className="flex items-center gap-3">
          <span className="serif text-xl font-bold leading-none">
            <span className="text-cream">Tast</span>
            <span className="text-white">IA</span>
          </span>
          <span className="inline-flex w-fit items-baseline gap-2 rounded-full bg-[color-mix(in_oklab,var(--foreground)_55%,transparent)] px-3 py-1 text-cream">
            <span className="font-sans text-sm font-normal">Sala</span>
            <span className="font-sans text-sm font-semibold tracking-widest">{code}</span>
          </span>
        </div>
        <span className="text-sm font-semibold text-cream">
          {STAGE_LABEL[state.stage]}
        </span>
      </header>

      <main className="mx-auto max-w-md px-4 pb-6 pt-20">
        <CompanionBody
          state={state}
          participants={participants}
          meId={meId}
          submitAnswer={submitAnswer}
          myAnswer={myAnswer}
        />

        {players.length > 0 && state.stage === "lobby" && (
          <div className="mt-6 rounded-2xl border border-border/60 bg-card p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground/55">
              En la sala ({players.length})
            </p>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {players.map((p) => (
                <LobbyPlayerTile key={p.id} participant={p} />
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

/** Tesela de jugador en lobby (mismo lenguaje visual que room/$code.tsx). */
function LobbyPlayerTile({ participant }: { participant: Participant }) {
  return (
    <li className="relative flex flex-col items-center gap-2 overflow-hidden rounded-lg border border-muted bg-white p-3 text-center text-ink">
      <LobbyAvatar name={participant.name} photo={participant.photo} />
      <span className="line-clamp-1 w-full text-sm font-medium" title={participant.name}>
        {participant.name}
      </span>
    </li>
  );
}

/** Avatar para teselas del lobby: foto reducida o iniciales sobre fondo --ink (§5.11). */
function LobbyAvatar({ name, photo }: { name: string; photo?: string }) {
  const label = initials(name) || "A";
  if (photo) {
    return (
      <img
        src={photo}
        alt={name || "Participante"}
        className="h-14 w-14 shrink-0 rounded-full border border-border/60 object-cover"
      />
    );
  }
  return (
    <span
      className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-ink text-lg font-bold text-white"
      role="img"
      aria-label={name || "Participante"}
    >
      {label}
    </span>
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
    return (
      <h2 className="serif mt-6 text-center text-2xl font-bold text-[oklch(1_0_0)]">
        Estás dentro. Esperando a que el anfitrión empiece la cata…
      </h2>
    );
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
    <CompanionScore title="¡Ha terminado la cata!" state={state} participants={participants} meId={meId} final />
  );
}

/**
 * Companion — Pregunta y Revelación de la fase (§5.2/§5.6b-A). RENDERIZA lo que el host
 * difunde en `RoomState`: `state.activeQuestion` (enunciado + opciones, sin respuesta) y
 * `state.reveal` (opción correcta). Ya NO deriva con `getQuestion` (anti-spoiler: el bundle
 * del jugador no contiene la respuesta antes del reveal). En `quiz` muestra opciones pulsables
 * (resalta la elegida, permite cambiar mientras está abierto); en `reveal` resalta la correcta
 * (`reveal.correctOptionIndex`) y muestra tu ✓/✗ (sin opción = ✗). Si aún no hay
 * `activeQuestion`, muestra "cargando…". El jugador solo responde: nunca avanza la máquina.
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
  const isReveal = state.step === "reveal";
  const question = state.activeQuestion;
  const correctIndex = state.reveal?.correctOptionIndex;
  const gotIt = myAnswer !== null && correctIndex !== undefined && myAnswer === correctIndex;
  // §5.5 — tu "+X" de esta Pregunta (solo si has acertado; en reveal).
  const myAward = state.lastAward?.[meId];

  if (question === undefined) {
    return (
      <div className="mt-4 rounded-none border border-primary/40 bg-card p-4 text-center">
        <p className="text-center text-xs uppercase tracking-wider text-foreground/55">
          Vino {state.wineIndex + 1} · {FASE_LABEL[state.fase]}
        </p>
        <p className="serif mt-2 text-lg font-bold text-foreground/50">Cargando pregunta…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center">
    <div className="w-full rounded-2xl border border-primary/40 bg-card p-4">
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
      <p className="serif mt-8 text-center text-3xl font-bold leading-[var(--tw-leading,var(--text-3xl--line-height))]">
        {question.prompt}
      </p>

      <div className="mt-8 grid gap-2">
        {question.options.map((opt, i) => {
          const selected = myAnswer === i;
          const correct = isReveal && i === correctIndex;
          // Base: mismo lenguaje visual que el host (/room ?mock=quiz) — borde --muted + bg blanco.
          // En reveal: verde para la correcta y primary para tu fallo; en quiz: primary para tu selección.
          const anim = isReveal
            ? selected && correct
              ? " answer-rubberband"
              : selected && !correct
                ? " answer-shake"
                : ""
            : "";
          const cls = (isReveal
            ? correct
              ? "border-green-600 bg-green-600/15 font-semibold"
              : selected
                ? "border-primary bg-primary/15"
                : "border-muted bg-white"
            : selected
              ? "border-primary bg-primary/15 font-semibold"
              : "border-muted bg-white hover:border-primary/60") + anim;
          return (
            <button
              key={i}
              type="button"
              disabled={isReveal}
              onClick={() => submitAnswer(i)}
              className={`flex h-14 items-center justify-between rounded-lg border px-4 text-left text-base transition-colors disabled:cursor-default ${cls}`}
            >
              <span>{opt}</span>
              {isReveal && correct && <span className="text-green-600">✓</span>}
              {isReveal && !correct && selected && <span className="text-primary">✗</span>}
            </button>
          );
        })}
      </div>

      {!isReveal ? (
        <p className="mt-8 text-center text-sm text-foreground/60">
          {myAnswer === null ? "Toca tu respuesta (puedes cambiarla)." : "Respuesta enviada ✓ — puedes cambiarla."}
        </p>
      ) : (
        <p className="mt-8 text-center text-sm font-semibold">
          {myAnswer === null ? (
            <span className="text-[1.25em] font-bold text-primary">✗ No respondiste</span>
          ) : gotIt ? (
            <span className="text-green-600">
              {myAward ? <span className="text-[1.25em] font-bold">+{myAward}</span> : null}
            </span>
          ) : (
            <span className="text-[1.25em] font-bold text-primary">✗ Fallaste</span>
          )}
        </p>
      )}
    </div>
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
    .filter((p) => !p.isHost && !p.isViewer)
    .slice()
    .sort((a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0));
  const rank = ranked.findIndex((p) => p.id === meId) + 1;
  const glitter = final && rank >= 1 && rank <= 3;

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center">
      <div
        className={`w-full rounded-2xl border border-primary/40 bg-card p-5 text-center ${glitter ? "glitter-glow" : ""}`}
        data-place={glitter ? rank : undefined}
      >
        <p className="serif text-2xl font-bold">{title}</p>
        <p className="mt-3 serif text-7xl font-bold text-primary">{state.scores[meId] ?? 0} pts</p>
        {rank > 0 && (
          <p className="mt-8 text-sm text-foreground/70">
            {final ? (
              rank <= 3 ? (
                <span className="inline-flex items-center gap-2 text-[1.5rem] font-bold">
                  <MedalIcon place={rank as 1 | 2 | 3} />
                  {rank === 1 ? "¡Ganas!" : rank === 2 ? "2º puesto" : "3º puesto"}
                </span>
              ) : (
                `Puesto ${rank} de ${ranked.length}`
              )
            ) : (
              `Vas ${rank}º de ${ranked.length}`
            )}
          </p>
        )}
      </div>
    </div>
  );
}

/** Medalla SVG para el podio final — 1.º oro, 2.º plata, 3.º bronce. Misma forma que /room. */
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
      className={`h-[1.4em] w-[1.4em] shrink-0 ${color}`}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7 2 L9.5 9 L12 6.5 L14.5 9 L17 2 Z" opacity="0.75" />
      <circle cx="12" cy="16" r="6" />
      <text x="12" y="18.5" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="white">
        {place}
      </text>
    </svg>
  );
}

/** Icono papelera para el botón "quitar foto" del welcome. */
function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
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

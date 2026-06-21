import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoIcon } from "@/components/logo";
import { validateAccessCode } from "@/lib/activate.server";

// §Activar — Ruta PÚBLICA (sin RequireAuth): el comprador es anónimo. Lee `?code=`
// (o lo deja teclear), valida el access_code server-side y, si es de un pedido
// pagado, deja "Empezar la cata" como host en /room/<code>.
export const Route = createFileRoute("/activar")({
  validateSearch: (s) => z.object({ code: z.string().optional() }).parse(s),
  head: () => ({
    meta: [{ title: "Tastia · Activar" }, { name: "robots", content: "noindex" }],
  }),
  component: ActivarPage,
});

type Status = "idle" | "validating" | "valid" | "invalid" | "unconfigured";

function ActivarPage() {
  const navigate = useNavigate();
  const { code } = Route.useSearch();
  const [input, setInput] = useState(code ?? "");
  const [status, setStatus] = useState<Status>("idle");
  const [roomCode, setRoomCode] = useState("");
  // Guard para auto-validar UNA sola vez al montar si vino `?code=` en la URL.
  const autoRan = useRef(false);

  async function run(raw: string) {
    if (!raw.trim()) return; // no validar vacío
    setStatus("validating");
    try {
      const res = await validateAccessCode({ data: { code: raw } });
      if ("configured" in res) {
        // Fallback honesto: sin service key no se finge validez.
        setStatus("unconfigured");
      } else if (res.ok) {
        setRoomCode(res.roomCode);
        setStatus("valid");
      } else {
        setStatus("invalid");
      }
    } catch {
      // Cualquier fallo de red/servidor → tratado como inválido (mensaje genérico).
      setStatus("invalid");
    }
  }

  // Auto-validación al montar cuando el code llega por la URL (una sola vez).
  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    if (code && code.trim()) void run(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(input);
  };

  const busy = status === "validating";

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm rounded-none border border-border/60 bg-card p-7 text-center">
        <div className="flex flex-col items-center">
          <LogoIcon className="h-12 w-12 text-primary" />
          <h1 className="serif mt-3 text-2xl font-bold text-primary">Activa tu cata</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Introduce el código de acceso de tu pedido.
          </p>
        </div>

        {status === "valid" ? (
          <div className="mt-6">
            <p className="serif text-lg font-bold text-green-600">✓ Acceso válido</p>
            <p className="mt-1 text-sm text-foreground/60">
              Eres el anfitrión. Comparte el código con tus invitados.
            </p>
            <Button
              variant="wine"
              size="lg"
              className="mt-5 w-full"
              onClick={() => navigate({ to: "/room/$code", params: { code: roomCode } })}
            >
              Empezar la cata ▸
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tu código"
              maxLength={32}
              autoFocus
              aria-label="Código de acceso"
              className="h-11 text-center text-lg tracking-widest"
            />

            {status === "invalid" && (
              <p className="mt-3 text-sm text-red-600" role="status" aria-live="polite">
                Código no válido o pago no encontrado.
              </p>
            )}
            {status === "unconfigured" && (
              <p className="mt-3 text-sm text-foreground/70" role="status" aria-live="polite">
                La activación aún no está disponible.
              </p>
            )}

            <Button
              type="submit"
              variant="wine"
              size="lg"
              className="mt-4 w-full"
              disabled={busy || !input.trim()}
            >
              {busy ? "Validando…" : "Validar"}
            </Button>
          </form>
        )}

        <a href="/" className="mt-5 block text-xs text-foreground/50 hover:text-foreground">
          ← Volver
        </a>
      </div>
    </main>
  );
}

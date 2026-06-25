import { useEffect, useRef, useState } from "react";
import { Cast } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type CastEnv = "airplay" | "presentation" | "manual";

function detectCastEnv(): CastEnv {
  if (typeof window === "undefined") return "manual";
  const ua = navigator.userAgent;
  const isSafari =
    /^((?!chrome|android).)*safari/i.test(ua) && !/chromium|crios|fxios/i.test(ua);
  if (isSafari) return "airplay";
  if ("PresentationRequest" in window) return "presentation";
  return "manual";
}

type Props = {
  code: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se invoca cuando el anfitrión abre la vista TV; la sala usa esto para tintar
   *  la píldora de cast en color "casteando". */
  onCastStarted?: () => void;
};

export function CastTvDialog({ code, open, onOpenChange, onCastStarted }: Props) {
  const [opened, setOpened] = useState(false);
  const env = useRef<CastEnv>("manual");

  useEffect(() => {
    env.current = detectCastEnv();
  }, []);

  function handleSend() {
    // Vista TV en pestaña aparte: el host la deja preparada en su portátil para
    // luego enviarla a Chromecast/Fire TV/Apple TV desde el menú del navegador.
    // El navegador no permite que JS dispare la pantalla de Cast sin un receptor
    // registrado, así que aquí solo abrimos la pestaña y guiamos al anfitrión.
    const url = `/tv/${code}`;
    window.open(url, `tastia-tv-${code}`, "noopener,noreferrer");

    if (env.current === "presentation") {
      try {
        const PR = (
          window as unknown as {
            PresentationRequest: new (urls: string[]) => { start: () => Promise<unknown> };
          }
        ).PresentationRequest;
        // Intento best-effort: con un receptor Cast compatible saltará el selector.
        // Si no hay receptor registrado para esta URL, la promesa rechaza y nos
        // quedamos con el flujo manual (la pestaña ya está abierta).
        new PR([new URL(url, window.location.origin).toString()]).start().catch(() => {});
      } catch {
        /* PresentationRequest no disponible/bloqueado: seguimos con el flujo manual. */
      }
    }

    setOpened(true);
    onCastStarted?.();
  }

  // Al cerrar el diálogo reseteamos el estado "ya he abierto la pestaña" para
  // que la próxima vez vuelva a mostrar la guía limpia.
  useEffect(() => {
    if (!open) setOpened(false);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md text-center">
        <DialogHeader className="items-center text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--wine)_12%,transparent)]">
            <Cast className="h-7 w-7 text-[color:var(--wine)]" strokeWidth={1.5} />
          </div>
          <DialogTitle className="serif text-2xl font-semibold text-[color:var(--wine)]">
            Reproduce TastIA en tu TV
          </DialogTitle>
          <DialogDescription className="text-[color:var(--ink)]">
            Abriremos la vista cinemática en una pestaña nueva, lista para enviar a tu
            Chromecast, Fire TV o Apple TV desde el menú del navegador.
          </DialogDescription>
        </DialogHeader>

        {opened && (
          <div className="mt-2 rounded-md bg-secondary/60 p-4 text-left text-sm text-[color:var(--ink)]">
            <p className="mb-2 font-semibold">Vista TV abierta en una nueva pestaña</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Cambia a la nueva pestaña ya abierta en tu navegador.</li>
              <li>
                Abre el menú del navegador (︙) → <span className="font-medium">Enviar / Cast…</span>
              </li>
              <li>
                Selecciona tu Chromecast / Fire TV / Apple TV y elige{" "}
                <span className="font-medium">Enviar pestaña</span>.
              </li>
            </ol>
          </div>
        )}

        <DialogFooter className="mt-2 flex-row justify-center gap-2 sm:justify-center">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Esta vez no
          </Button>
          <Button variant="wine" onClick={handleSend}>
            Abrir vista TV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

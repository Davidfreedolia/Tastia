import { createFileRoute } from "@tanstack/react-router";
import { LogoIcon } from "@/components/logo";

// Pantalla "en construcción": fondo naranja + icono grande (sacacorchos) → /login.
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Tastia" }, { name: "robots", content: "noindex" }],
  }),
  component: Construction,
});

function Construction() {
  return (
    <main
      className="grid min-h-screen place-items-center"
      style={{
        background:
          "radial-gradient(120% 120% at 20% 85%, #F2913E 0%, #E85E22 42%, #D8451A 100%)",
      }}
    >
      <a
        href="/login"
        aria-label="Entrar"
        className="block rounded-2xl p-8 transition-transform duration-300 hover:scale-105 active:scale-95"
      >
        <LogoIcon className="h-28 w-28 text-[#2B1A12] sm:h-36 sm:w-36" />
      </a>
    </main>
  );
}

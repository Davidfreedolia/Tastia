import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";
import { LogoIcon } from "@/components/logo";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Tastia · Entrar" }, { name: "robots", content: "noindex" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const supabase = getSupabase();
    if (!supabase) {
      setError("Autenticación no disponible.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) setError(err.message);
    else navigate({ to: "/landing" }); // tras el login → toda la web
  }

  return (
    <main
      className="grid min-h-screen place-items-center px-4"
      style={{
        background:
          "radial-gradient(120% 120% at 20% 85%, #F2913E 0%, #E85E22 42%, #D8451A 100%)",
      }}
    >
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl bg-[#FFF8F0] p-7 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <LogoIcon className="h-12 w-12 text-[#D8451A]" />
          <h1 className="serif mt-3 text-2xl font-bold text-[#2B1A12]">Tastia</h1>
          <p className="text-sm text-[#2B1A12]/60">Acceso al equipo</p>
        </div>

        <label className="mt-6 block text-sm font-semibold text-[#2B1A12]/70">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#2B1A12]/15 bg-white px-3 py-2.5 text-[#2B1A12] outline-none focus:border-[#D8451A]"
          />
        </label>

        <label className="mt-3 block text-sm font-semibold text-[#2B1A12]/70">
          Contraseña
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#2B1A12]/15 bg-white px-3 py-2.5 text-[#2B1A12] outline-none focus:border-[#D8451A]"
          />
        </label>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-lg bg-[#D8451A] px-4 py-2.5 font-semibold text-white transition hover:bg-[#c23d16] disabled:opacity-60"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>

        <a href="/" className="mt-4 block text-center text-xs text-[#2B1A12]/50 hover:text-[#2B1A12]">
          ← Volver
        </a>
      </form>
    </main>
  );
}

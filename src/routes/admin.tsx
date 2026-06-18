import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { RequireAuth } from "@/lib/require-auth";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "@/components/logo";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Tastia · Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <RequireAuth>
      <Admin />
    </RequireAuth>
  ),
});

const SECTIONS = [
  { id: "dashboard", label: "Panel" },
  { id: "suppliers", label: "Proveedores" },
  { id: "products", label: "Productos" },
  { id: "wines", label: "Vinos" },
  { id: "orders", label: "Pedidos" },
  { id: "gamification", label: "Gamificación" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

function Admin() {
  const navigate = useNavigate();
  const [section, setSection] = useState<SectionId>("dashboard");

  async function logout() {
    await getSupabase()?.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border/60 bg-card px-5 py-3">
        <div className="flex items-center gap-2">
          <LogoIcon className="h-6 w-6 text-primary" />
          <span className="serif text-lg font-bold">Tastia · Admin</span>
        </div>
        <button onClick={logout} className="text-sm text-foreground/60 hover:text-foreground">
          Salir
        </button>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-6 sm:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto sm:w-44 sm:flex-col">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`whitespace-nowrap rounded-none px-3 py-2 text-left text-sm ${
                section === s.id
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "hover:bg-secondary/60"
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <main className="flex-1">
          {section === "dashboard" && <Dashboard />}
          {section === "suppliers" && <Suppliers />}
          {section !== "dashboard" && section !== "suppliers" && <Placeholder section={section} />}
        </main>
      </div>
    </div>
  );
}

function Dashboard() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    const tables = ["clients", "suppliers", "products", "wines", "orders", "pack_tiers"] as const;
    Promise.all(
      tables.map(async (t) => {
        const { count } = await sb.from(t).select("*", { count: "exact", head: true });
        return [t, count ?? 0] as const;
      }),
    ).then((pairs) => setCounts(Object.fromEntries(pairs)));
  }, []);

  const cards: [string, string][] = [
    ["Clientes", "clients"],
    ["Proveedores", "suppliers"],
    ["Productos", "products"],
    ["Vinos", "wines"],
    ["Pedidos", "orders"],
    ["Packs", "pack_tiers"],
  ];

  return (
    <div>
      <h1 className="serif text-2xl font-bold">Panel</h1>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map(([label, key]) => (
          <div key={key} className="rounded-none border border-border/60 bg-card p-4">
            <div className="text-xs uppercase tracking-wider text-foreground/55">{label}</div>
            <div className="serif text-3xl font-bold text-primary">{counts[key] ?? "…"}</div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-foreground/55">
        Datos en vivo desde Supabase. Puedes gestionar todo aquí o desde Supabase Studio (importar
        proveedores por CSV, subir imágenes, etc.).
      </p>
    </div>
  );
}

type SupplierRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
};

function Suppliers() {
  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", city: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb.from("suppliers").select("id,name,email,phone,city").order("name");
    setRows((data as SupplierRow[]) ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const sb = getSupabase();
    const { error: err } = await sb!.from("suppliers").insert({
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      city: form.city || null,
    });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setForm({ name: "", email: "", phone: "", city: "" });
    load();
  }

  const fields: [keyof typeof form, string][] = [
    ["name", "Nombre*"],
    ["email", "Email"],
    ["phone", "Teléfono"],
    ["city", "Ciudad"],
  ];

  return (
    <div>
      <h1 className="serif text-2xl font-bold">Proveedores</h1>
      <form
        onSubmit={add}
        className="mt-4 flex flex-wrap items-end gap-2 rounded-none border border-border/60 bg-card p-4"
      >
        {fields.map(([f, placeholder]) => (
          <input
            key={f}
            required={f === "name"}
            placeholder={placeholder}
            value={form[f]}
            onChange={(e) => setForm({ ...form, [f]: e.target.value })}
            className="min-w-32 flex-1 rounded-none border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        ))}
        <Button type="submit" variant="wine" size="sm" disabled={saving || !form.name}>
          {saving ? "…" : "Añadir"}
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-foreground/55">
            <th className="py-2">Nombre</th>
            <th>Email</th>
            <th>Teléfono</th>
            <th>Ciudad</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/40">
              <td className="py-2 font-medium">{r.name}</td>
              <td>{r.email}</td>
              <td>{r.phone}</td>
              <td>{r.city}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="py-3 text-foreground/55">
                Sin proveedores todavía. Añade uno arriba o importa un CSV desde Supabase Studio.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Placeholder({ section }: { section: string }) {
  return (
    <div>
      <h1 className="serif text-2xl font-bold capitalize">{section}</h1>
      <p className="mt-3 max-w-prose text-sm text-foreground/60">
        Sección pendiente. De momento gestiónala desde Supabase Studio. Para añadir el CRUD aquí,
        sigue el patrón de <span className="font-semibold">Proveedores</span> en{" "}
        <code>src/routes/admin.tsx</code> (la tabla y políticas ya están listas en la BD).
      </p>
    </div>
  );
}

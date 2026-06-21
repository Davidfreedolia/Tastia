import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { RequireAuth } from "@/lib/require-auth";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "@/components/logo";
import { QuestionBank } from "@/components/question-bank";
import { WineClassification } from "@/components/wine-classification";
import {
  defaultsFromGlobal,
  GAME_TIERS,
  hasErrors,
  validateGameSettings,
  type PriceBand,
  type SettingsForm,
} from "@/lib/game-settings";

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
  { id: "questions", label: "Preguntas" },
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
          {section === "gamification" && <GameSettings />}
          {section === "questions" && <QuestionBank />}
          {section === "wines" && <WineClassification />}
          {section !== "dashboard" &&
            section !== "suppliers" &&
            section !== "gamification" &&
            section !== "questions" &&
            section !== "wines" && <Placeholder section={section} />}
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

// ── §5.8a · Gamificación: editor de game_settings + estado del banco ──────────

/** Fila de `game_settings` tal como la cargamos (solo los campos que usamos). */
type GameSettingsRow = SettingsForm & {
  id: string;
  pack_tier: PriceBand | null;
};

/** Campos editables del bloque, con su etiqueta amigable (en orden de render). */
const SETTINGS_FIELDS: ReadonlyArray<{ key: keyof SettingsForm; label: string }> = [
  { key: "time_vista_s", label: "Tiempo Vista (s)" },
  { key: "time_olfato_s", label: "Tiempo Olfato (s)" },
  { key: "time_gusto_s", label: "Tiempo Gusto (s)" },
  { key: "time_gamificacion_s", label: "Tiempo Gamificación (s)" },
  { key: "points_base", label: "Puntos base" },
  { key: "bonus_max", label: "Bonus máx." },
];

/** Extrae los 6 campos editables de una fila cruda de Supabase. */
function toForm(row: GameSettingsRow): SettingsForm {
  return {
    time_vista_s: row.time_vista_s,
    time_olfato_s: row.time_olfato_s,
    time_gusto_s: row.time_gusto_s,
    time_gamificacion_s: row.time_gamificacion_s,
    points_base: row.points_base,
    bonus_max: row.bonus_max,
  };
}

function GameSettings() {
  const [rows, setRows] = useState<GameSettingsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function load() {
    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      setLoadError("Supabase no está configurado.");
      return;
    }
    const { data, error } = await sb.from("game_settings").select("*");
    setLoadError(error ? error.message : "");
    setRows((data as GameSettingsRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  // Fila global (pack_tier null) → defaults para tiers sin fila propia.
  const globalRow = rows.find((r) => r.pack_tier === null);
  const globalDefaults: SettingsForm = globalRow
    ? toForm(globalRow)
    : {
        time_vista_s: 30,
        time_olfato_s: 30,
        time_gusto_s: 45,
        time_gamificacion_s: 30,
        points_base: 100,
        bonus_max: 50,
      };

  return (
    <div>
      <h1 className="serif text-2xl font-bold">Gamificación</h1>
      <p className="mt-2 max-w-prose text-sm text-foreground/60">
        Tiempos por fase, puntos base y bonus. Edita la fila <strong>Global</strong> y, si quieres
        afinar por gama, cada pack (Básico/Normal/Premium). Estos valores se preparan aquí; el juego
        los usará más adelante.
      </p>

      {loadError && (
        <p className="mt-3 text-sm text-red-600">No se pudieron cargar los ajustes: {loadError}</p>
      )}

      {loading ? (
        <p className="mt-5 text-sm text-foreground/55">Cargando…</p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {GAME_TIERS.map((tier) => {
            const existing = rows.find((r) => r.pack_tier === tier.key);
            return (
              <SettingsBlock
                key={tier.label}
                tierKey={tier.key}
                label={tier.label}
                rowId={existing?.id ?? null}
                initial={
                  existing
                    ? toForm(existing)
                    : defaultsFromGlobal(globalDefaults)
                }
                missing={!existing}
                onSaved={load}
              />
            );
          })}
        </div>
      )}

      <Readiness />
    </div>
  );
}

function SettingsBlock({
  tierKey,
  label,
  rowId,
  initial,
  missing,
  onSaved,
}: {
  tierKey: PriceBand | null;
  label: string;
  rowId: string | null;
  initial: SettingsForm;
  missing: boolean;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<SettingsForm>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Si la carga refresca los datos, re-sincroniza el formulario.
  useEffect(() => {
    setForm(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initial.time_vista_s,
    initial.time_olfato_s,
    initial.time_gusto_s,
    initial.time_gamificacion_s,
    initial.points_base,
    initial.bonus_max,
  ]);

  const errors = validateGameSettings(form);
  const invalid = hasErrors(errors);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (invalid) return;
    setError("");
    setSaved(false);
    setSaving(true);
    const sb = getSupabase();
    if (!sb) {
      setSaving(false);
      setError("Supabase no está configurado.");
      return;
    }

    // UPDATE por id si la fila existe; si no, INSERT (con su pack_tier; null = global).
    // NO usamos upsert: el índice único de pack_tier es PARCIAL (WHERE pack_tier IS NOT NULL) y
    // PostgREST no puede apuntarlo con onConflict (error 42P10). `.select()` devuelve las filas
    // afectadas → detecta escrituras de 0 filas (RLS sin permiso) y evita un falso "Guardado".
    const query = rowId
      ? sb.from("game_settings").update(form).eq("id", rowId).select("id")
      : sb.from("game_settings").insert({ ...form, pack_tier: tierKey }).select("id");
    const { data, error: err } = await query;

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (!data || data.length === 0) {
      setError("No se guardó (¿sin permiso de administrador?).");
      return;
    }
    setSaved(true);
    onSaved();
  }

  return (
    <form onSubmit={save} className="rounded-none border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="serif text-lg font-bold">{label}</h2>
        {missing && (
          <span className="text-xs uppercase tracking-wider text-foreground/55">sin guardar</span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {SETTINGS_FIELDS.map(({ key, label: fieldLabel }) => (
          <label key={key} className="flex flex-col gap-1 text-xs text-foreground/60">
            {fieldLabel}
            <input
              type="number"
              value={Number.isNaN(form[key]) ? "" : form[key]}
              onChange={(e) => {
                setSaved(false);
                setForm({ ...form, [key]: e.target.value === "" ? NaN : Number(e.target.value) });
              }}
              className="rounded-none border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            {errors[key] && <span className="text-red-600">{errors[key]}</span>}
          </label>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Button type="submit" variant="wine" size="sm" disabled={saving || invalid}>
          {saving ? "…" : "Guardar"}
        </Button>
        {saved && !error && <span className="text-sm text-green-600">Guardado</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

type ReadinessRow = {
  wine_id: string | null;
  name: string | null;
  fases_cubiertas: number | null;
  ready: boolean | null;
};

function Readiness() {
  const [rows, setRows] = useState<ReadinessRow[]>([]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    sb.from("wines_question_readiness")
      .select("wine_id,name,fases_cubiertas,ready")
      .then(({ data }) => setRows((data as ReadinessRow[]) ?? []));
  }, []);

  return (
    <div className="mt-8">
      <h2 className="serif text-xl font-bold">Estado del banco</h2>
      <p className="mt-1 text-sm text-foreground/55">
        Solo lectura: qué vinos tienen las fases cubiertas y están listos.
      </p>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-foreground/55">
            <th className="py-2">Vino</th>
            <th>Fases</th>
            <th>Listo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.wine_id ?? `r-${i}`} className="border-b border-border/40">
              <td className="py-2 font-medium">{r.name}</td>
              <td>{r.fases_cubiertas ?? 0}/4</td>
              <td>{r.ready ? "✓" : "✗"}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="py-3 text-foreground/55">
                Sin vinos todavía.
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

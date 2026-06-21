// §5.8c — UI de clasificación de vinos para `/admin`.
// Por cada vino: edita `category` (enum `wine_category`) + `classification_id` (de
// `wine_classifications`, filtrado por la categoría elegida y solo `active`). Escribe vía el
// cliente autenticado (RLS). Imita el patrón de `SettingsBlock`/`QuestionBank` en `admin.tsx`:
// tras el UPDATE, `.select("id")` para detectar 0 filas (RLS sin permiso) → error honesto, sin
// un falso "Guardado". La coherencia tipo↔clasificación se deriva del select y se reasegura con
// `isPairingValid` (defensa) antes de guardar.

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  classificationsFor,
  isPairingValid,
  WINE_CATEGORIES,
  type ClassificationOption,
  type WineCategory,
} from "@/lib/wine-classification";

type WineRow = {
  id: string;
  name: string;
  category: WineCategory | null;
  classification_id: string | null;
};

type ClassificationRow = {
  id: string;
  category: WineCategory;
  label_es: string;
  slug: string;
  active: boolean;
};

/** Estado editable por vino (lo que el usuario tiene en pantalla antes de guardar). */
type Draft = { category: WineCategory | ""; classification_id: string };

/** Estado por fila del proceso de guardado (no global). */
type RowState = { saving: boolean; saved: boolean; error: string };

const INPUT_CLS =
  "rounded-none border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

const CATEGORY_LABELS: Record<WineCategory, string> = {
  tinto: "Tinto",
  blanco: "Blanco",
  rosado: "Rosado",
  espumoso: "Espumoso",
  cava: "Cava",
};

const IDLE: RowState = { saving: false, saved: false, error: "" };

export function WineClassification() {
  const [wines, setWines] = useState<WineRow[]>([]);
  const [classifications, setClassifications] = useState<ClassificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [configured, setConfigured] = useState(true);

  // Borrador editable por vino + estado de guardado por fila.
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [rowState, setRowState] = useState<Record<string, RowState>>({});

  async function load() {
    const sb = getSupabase();
    if (!sb) {
      setConfigured(false);
      setLoading(false);
      return;
    }
    const [winesRes, classRes] = await Promise.all([
      sb.from("wines").select("id,name,category,classification_id").order("name"),
      sb
        .from("wine_classifications")
        .select("id,category,label_es,slug,active")
        .order("label_es"),
    ]);
    const err = winesRes.error ?? classRes.error;
    setLoadError(err ? err.message : "");
    const wineRows = (winesRes.data as WineRow[]) ?? [];
    setWines(wineRows);
    setClassifications((classRes.data as ClassificationRow[]) ?? []);
    // Inicializa el borrador desde la fila (categoría null → "").
    setDrafts(
      Object.fromEntries(
        wineRows.map((w) => [
          w.id,
          { category: w.category ?? "", classification_id: w.classification_id ?? "" },
        ]),
      ),
    );
    setRowState({});
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  // Las clasificaciones para `classificationsFor` (subconjunto tipado).
  const options: ClassificationOption[] = useMemo(
    () =>
      classifications.map((c) => ({
        id: c.id,
        category: c.category,
        label_es: c.label_es,
        active: c.active,
      })),
    [classifications],
  );

  function patchRowState(id: string, patch: Partial<RowState>) {
    setRowState((prev) => ({ ...prev, [id]: { ...(prev[id] ?? IDLE), ...patch } }));
  }

  function setCategory(wine: WineRow, category: WineCategory | "") {
    setDrafts((prev) => {
      const draft = prev[wine.id] ?? { category: "", classification_id: "" };
      // Al cambiar la categoría, si la clasificación actual ya no pertenece, límpiala.
      const classification_id = isPairingValid(options, category, draft.classification_id)
        ? draft.classification_id
        : "";
      return { ...prev, [wine.id]: { category, classification_id } };
    });
    patchRowState(wine.id, { saved: false });
  }

  function setClassification(wineId: string, classification_id: string) {
    setDrafts((prev) => {
      const draft = prev[wineId] ?? { category: "", classification_id: "" };
      return { ...prev, [wineId]: { ...draft, classification_id } };
    });
    patchRowState(wineId, { saved: false });
  }

  // ── Guardar (IMITA SettingsBlock.save) ──────────────────────────────
  async function save(wine: WineRow) {
    const draft = drafts[wine.id] ?? { category: "", classification_id: "" };
    patchRowState(wine.id, { saving: true, saved: false, error: "" });

    const sb = getSupabase();
    if (!sb) {
      patchRowState(wine.id, { saving: false, error: "Supabase no está configurado." });
      return;
    }

    const cat = draft.category || null;
    // Defensa: nunca guardar una clasificación que no pertenezca a la categoría.
    const clsId = isPairingValid(options, draft.category, draft.classification_id)
      ? draft.classification_id || null
      : null;

    // `.select("id")` devuelve las filas afectadas → detecta escrituras de 0 filas
    // (RLS sin permiso de admin) y evita un falso "Guardado".
    const { data, error: err } = await sb
      .from("wines")
      .update({ category: cat, classification_id: clsId })
      .eq("id", wine.id)
      .select("id");

    if (err) {
      patchRowState(wine.id, { saving: false, error: err.message });
      return;
    }
    if (!data || data.length === 0) {
      patchRowState(wine.id, {
        saving: false,
        error: "No se guardó (¿sin permiso de administrador?).",
      });
      return;
    }
    patchRowState(wine.id, { saving: false, saved: true });
    load();
  }

  if (!configured) {
    return (
      <div>
        <h1 className="serif text-2xl font-bold">Vinos</h1>
        <p className="mt-3 max-w-prose text-sm text-foreground/60">
          Supabase no está configurado. Configura las variables de entorno para clasificar los
          vinos.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="serif text-2xl font-bold">Vinos</h1>
      <p className="mt-2 max-w-prose text-sm text-foreground/60">
        Asigna el <strong>tipo</strong> (tinto, blanco, etc.) y la <strong>clasificación</strong>{" "}
        de cada vino. La clasificación se filtra por el tipo elegido (solo las activas); puedes
        dejarla <em>sin clasificar</em>. El importador CSV ya los rellena al importar; aquí los
        corriges a mano.
      </p>

      {loadError && <p className="mt-3 text-sm text-red-600">No se pudo cargar: {loadError}</p>}

      {loading ? (
        <p className="mt-5 text-sm text-foreground/55">Cargando…</p>
      ) : wines.length === 0 ? (
        <p className="mt-5 text-sm text-foreground/55">
          Sin vinos todavía. Impórtalos por CSV o añádelos desde Supabase Studio.
        </p>
      ) : classifications.length === 0 ? (
        <p className="mt-5 text-sm text-foreground/55">
          No hay clasificaciones definidas en <code>wine_classifications</code>. Puedes asignar el
          tipo igualmente; la clasificación quedará «sin clasificar».
        </p>
      ) : null}

      {!loading && wines.length > 0 && (
        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-foreground/55">
              <th className="py-2">Vino</th>
              <th>Tipo</th>
              <th>Clasificación</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {wines.map((w) => {
              const draft = drafts[w.id] ?? { category: "", classification_id: "" };
              const state = rowState[w.id] ?? IDLE;
              const clsOptions = classificationsFor(options, draft.category);
              return (
                <tr key={w.id} className="border-b border-border/40 align-top">
                  <td className="py-2 font-medium">{w.name}</td>
                  <td className="py-2 pr-2">
                    <select
                      value={draft.category}
                      onChange={(e) => setCategory(w, e.target.value as WineCategory | "")}
                      className={INPUT_CLS}
                      aria-label={`Tipo de ${w.name}`}
                    >
                      <option value="">—</option>
                      {WINE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_LABELS[c]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      value={draft.classification_id}
                      onChange={(e) => setClassification(w.id, e.target.value)}
                      disabled={!draft.category || clsOptions.length === 0}
                      className={INPUT_CLS}
                      aria-label={`Clasificación de ${w.name}`}
                    >
                      <option value="">Sin clasificar</option>
                      {clsOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label_es}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap py-2 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {state.saved && !state.error && (
                        <span className="text-sm text-green-600">Guardado</span>
                      )}
                      {state.error && <span className="text-sm text-red-600">{state.error}</span>}
                      <Button
                        type="button"
                        variant="wine"
                        size="sm"
                        disabled={state.saving}
                        onClick={() => save(w)}
                      >
                        {state.saving ? "…" : "Guardar"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

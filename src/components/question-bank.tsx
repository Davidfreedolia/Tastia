// §5.8b — UI del banco de preguntas (`game_questions`) para `/admin`.
// CRUD por vino y fase, escribiendo vía el cliente autenticado (RLS). Imita el patrón de
// `SettingsBlock`/`Suppliers` en `admin.tsx`: tras escribir, `.select("id")` para detectar
// 0 filas (RLS sin permiso) → error honesto, sin un falso "Guardado".

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  hasQuestionErrors,
  QUESTION_FASES,
  QUESTION_TYPES,
  questionFormFromRow,
  questionInsertFromForm,
  validateQuestionForm,
  type QuestionForm,
} from "@/lib/game-questions";
import type { Database } from "@/lib/database.types";

type WineRow = { id: string; name: string };
type QuestionRow = Database["public"]["Tables"]["game_questions"]["Row"];

const FASE_LABELS: Record<(typeof QUESTION_FASES)[number], string> = {
  vista: "Vista",
  olfato: "Olfato",
  gusto: "Gusto",
  gamificacion: "Gamificación",
};

/** Formulario vacío para el modo ALTA (2 opciones por defecto, activo). */
function emptyForm(): QuestionForm {
  return {
    wine_id: "",
    fase: "vista",
    type: "",
    text_es: "",
    text_en: "",
    options: ["", ""],
    correct_answer: "",
    points: 100,
    active: true,
  };
}

const INPUT_CLS =
  "rounded-none border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

export function QuestionBank() {
  const [wines, setWines] = useState<WineRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [configured, setConfigured] = useState(true);

  const [form, setForm] = useState<QuestionForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [filterWine, setFilterWine] = useState<string>("");

  async function load() {
    const sb = getSupabase();
    if (!sb) {
      setConfigured(false);
      setLoading(false);
      return;
    }
    const [winesRes, questionsRes] = await Promise.all([
      sb.from("wines").select("id,name").order("name"),
      sb.from("game_questions").select("*").order("text_es"),
    ]);
    const err = winesRes.error ?? questionsRes.error;
    setLoadError(err ? err.message : "");
    setWines((winesRes.data as WineRow[]) ?? []);
    setQuestions((questionsRes.data as QuestionRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const errors = validateQuestionForm(form);
  const invalid = hasQuestionErrors(errors);

  const wineName = useMemo(() => {
    const map = new Map(wines.map((w) => [w.id, w.name]));
    return (id: string | null) => (id ? map.get(id) ?? "—" : "—");
  }, [wines]);

  const filtered = filterWine
    ? questions.filter((q) => q.wine_id === filterWine)
    : questions;

  function resetForm() {
    setForm(emptyForm());
    setEditingId(null);
  }

  function startEdit(row: QuestionRow) {
    setForm(questionFormFromRow(row));
    setEditingId(row.id);
    setSaved(false);
    setError("");
  }

  // ── Opciones dinámicas ──────────────────────────────────────────────
  function setOption(i: number, value: string) {
    setSaved(false);
    setForm((f) => {
      const prev = f.options[i] ?? "";
      const options = f.options.map((o, idx) => (idx === i ? value : o));
      // Si la opción editada era la correcta, sigue la pista del texto.
      const correct_answer = f.correct_answer === prev ? value : f.correct_answer;
      return { ...f, options, correct_answer };
    });
  }
  function addOption() {
    setSaved(false);
    setForm((f) => ({ ...f, options: [...f.options, ""] }));
  }
  function removeOption(i: number) {
    setSaved(false);
    setForm((f) => {
      const removed = f.options[i] ?? "";
      const options = f.options.filter((_, idx) => idx !== i);
      const correct_answer = f.correct_answer === removed ? "" : f.correct_answer;
      return { ...f, options, correct_answer };
    });
  }
  function pickCorrect(value: string) {
    setSaved(false);
    setForm((f) => ({ ...f, correct_answer: value }));
  }

  // ── Guardar (IMITA SettingsBlock.save) ──────────────────────────────
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

    const payload = questionInsertFromForm(form);
    // `.select("id")` devuelve las filas afectadas → detecta escrituras de 0 filas
    // (RLS sin permiso de admin) y evita un falso "Guardado".
    const query = editingId
      ? sb.from("game_questions").update(payload).eq("id", editingId).select("id")
      : sb.from("game_questions").insert(payload).select("id");
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
    resetForm();
    load();
  }

  // ── Acciones de fila ────────────────────────────────────────────────
  async function toggleActive(row: QuestionRow) {
    setError("");
    const sb = getSupabase();
    if (!sb) return;
    const { data, error: err } = await sb
      .from("game_questions")
      .update({ active: !row.active })
      .eq("id", row.id)
      .select("id");
    if (err) {
      setError(err.message);
      return;
    }
    if (!data || data.length === 0) {
      setError("No se guardó (¿sin permiso de administrador?).");
      return;
    }
    load();
  }

  async function remove(row: QuestionRow) {
    if (!window.confirm("¿Borrar esta pregunta? No se puede deshacer.")) return;
    setError("");
    const sb = getSupabase();
    if (!sb) return;
    const { data, error: err } = await sb
      .from("game_questions")
      .delete()
      .eq("id", row.id)
      .select("id");
    if (err) {
      setError(err.message);
      return;
    }
    if (!data || data.length === 0) {
      setError("No se borró (¿sin permiso de administrador?).");
      return;
    }
    if (editingId === row.id) resetForm();
    load();
  }

  if (!configured) {
    return (
      <div>
        <h1 className="serif text-2xl font-bold">Preguntas</h1>
        <p className="mt-3 max-w-prose text-sm text-foreground/60">
          Supabase no está configurado. Configura las variables de entorno para gestionar el banco
          de preguntas.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="serif text-2xl font-bold">Preguntas</h1>
      <p className="mt-2 max-w-prose text-sm text-foreground/60">
        Banco de preguntas del juego por vino y fase. Las opciones se guardan como lista y la
        respuesta correcta debe ser una de ellas (es lo que el juego espera).
      </p>

      {loadError && (
        <p className="mt-3 text-sm text-red-600">No se pudo cargar: {loadError}</p>
      )}

      {/* ── Formulario alta/edición ── */}
      <form onSubmit={save} className="mt-4 rounded-none border border-border/60 bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="serif text-lg font-bold">
            {editingId ? "Editar pregunta" : "Nueva pregunta"}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-foreground/60 hover:text-foreground"
            >
              Cancelar edición
            </button>
          )}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs text-foreground/60">
            Vino*
            <select
              value={form.wine_id}
              onChange={(e) => {
                setSaved(false);
                setForm({ ...form, wine_id: e.target.value });
              }}
              className={INPUT_CLS}
            >
              <option value="">— Selecciona —</option>
              {wines.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            {errors.wine_id && <span className="text-red-600">{errors.wine_id}</span>}
          </label>

          <label className="flex flex-col gap-1 text-xs text-foreground/60">
            Fase
            <select
              value={form.fase}
              onChange={(e) => {
                setSaved(false);
                setForm({ ...form, fase: e.target.value as QuestionForm["fase"] });
              }}
              className={INPUT_CLS}
            >
              {QUESTION_FASES.map((f) => (
                <option key={f} value={f}>
                  {FASE_LABELS[f]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-foreground/60">
            Tipo
            <select
              value={form.type}
              onChange={(e) => {
                setSaved(false);
                setForm({ ...form, type: e.target.value as QuestionForm["type"] });
              }}
              className={INPUT_CLS}
            >
              <option value="">—</option>
              {QUESTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-foreground/60">
            Enunciado (ES)*
            <input
              value={form.text_es}
              onChange={(e) => {
                setSaved(false);
                setForm({ ...form, text_es: e.target.value });
              }}
              className={INPUT_CLS}
            />
            {errors.text_es && <span className="text-red-600">{errors.text_es}</span>}
          </label>

          <label className="flex flex-col gap-1 text-xs text-foreground/60">
            Enunciado (EN)
            <input
              value={form.text_en}
              onChange={(e) => {
                setSaved(false);
                setForm({ ...form, text_en: e.target.value });
              }}
              className={INPUT_CLS}
            />
          </label>
        </div>

        {/* Opciones + correcta */}
        <div className="mt-3">
          <div className="text-xs text-foreground/60">Opciones (marca la correcta)*</div>
          <div className="mt-2 flex flex-col gap-2">
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  checked={opt.trim() !== "" && form.correct_answer === opt}
                  onChange={() => pickCorrect(opt)}
                  disabled={opt.trim() === ""}
                  className="shrink-0"
                  aria-label={`Marcar opción ${i + 1} como correcta`}
                />
                <input
                  value={opt}
                  placeholder={`Opción ${i + 1}`}
                  onChange={(e) => setOption(i, e.target.value)}
                  className={`flex-1 ${INPUT_CLS}`}
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  disabled={form.options.length <= 2}
                  className="rounded-none border border-border px-2 py-1 text-xs text-foreground/60 hover:text-foreground disabled:opacity-40"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addOption}
            className="mt-2 rounded-none border border-border px-3 py-1 text-xs hover:bg-secondary/60"
          >
            + Añadir opción
          </button>
          {errors.options && <p className="mt-1 text-xs text-red-600">{errors.options}</p>}
          {errors.correct_answer && (
            <p className="mt-1 text-xs text-red-600">{errors.correct_answer}</p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-xs text-foreground/60">
            Puntos*
            <input
              type="number"
              value={Number.isNaN(form.points) ? "" : form.points}
              onChange={(e) => {
                setSaved(false);
                setForm({
                  ...form,
                  points: e.target.value === "" ? NaN : Number(e.target.value),
                });
              }}
              className={`w-28 ${INPUT_CLS}`}
            />
            {errors.points && <span className="text-red-600">{errors.points}</span>}
          </label>

          <label className="flex items-center gap-2 text-sm text-foreground/70">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => {
                setSaved(false);
                setForm({ ...form, active: e.target.checked });
              }}
            />
            Activa
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" variant="wine" size="sm" disabled={saving || invalid}>
            {saving ? "…" : editingId ? "Guardar cambios" : "Crear pregunta"}
          </Button>
          {saved && !error && <span className="text-sm text-green-600">Guardado</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>

      {/* ── Lista filtrable ── */}
      <div className="mt-6 flex items-center gap-2">
        <label className="text-xs text-foreground/60">Filtrar por vino</label>
        <select
          value={filterWine}
          onChange={(e) => setFilterWine(e.target.value)}
          className={INPUT_CLS}
        >
          <option value="">Todos</option>
          {wines.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-foreground/55">Cargando…</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-foreground/55">
              <th className="py-2">Enunciado</th>
              <th>Vino</th>
              <th>Fase</th>
              <th>Tipo</th>
              <th>Puntos</th>
              <th>Activa</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((q) => (
              <tr key={q.id} className="border-b border-border/40 align-top">
                <td className="py-2 font-medium">{q.text_es}</td>
                <td>{wineName(q.wine_id)}</td>
                <td>{FASE_LABELS[q.fase]}</td>
                <td>{q.type ?? "—"}</td>
                <td>{q.points}</td>
                <td>{q.active ? "✓" : "✗"}</td>
                <td className="whitespace-nowrap text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(q)}
                      className="rounded-none border border-border px-2 py-1 text-xs hover:bg-secondary/60"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(q)}
                      className="rounded-none border border-border px-2 py-1 text-xs hover:bg-secondary/60"
                    >
                      {q.active ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(q)}
                      className="rounded-none border border-border px-2 py-1 text-xs text-red-600 hover:bg-secondary/60"
                    >
                      Borrar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-3 text-foreground/55">
                  Sin preguntas todavía. Crea una arriba.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

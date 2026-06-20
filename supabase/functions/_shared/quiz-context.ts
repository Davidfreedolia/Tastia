import type { SupabaseClient } from "jsr:@supabase/supabase-js@2"
import { resolveSessionWines, type WineRow } from "./wines.ts"

export type SenseNote = {
  vista: string | null
  olfato: string | null
  gusto: string | null
}
export type EnrichedWine = WineRow & { classLabel: string | null; note: SenseNote }
export type ClassEntry = { category: string; label: string }

export type QuizContext = {
  wines: EnrichedWine[]
  classCatalog: ClassEntry[] // todas las clasificaciones (pool de distractores)
}

/**
 * Carga todo lo que necesita la derivación de preguntas para una sala:
 * los vinos de la partida (enriquecidos con su nota de cata y su label de
 * clasificación) + el catálogo de clasificaciones para los distractores.
 * Lo usan `quiz-bootstrap` y `quiz-close` por igual → mismas entradas, misma
 * derivación determinista.
 */
export async function loadQuizContext(
  supabase: SupabaseClient,
  code: string,
): Promise<QuizContext> {
  const wines = await resolveSessionWines(supabase, code)
  const wineIds = wines.map((w) => w.id)

  // labels de clasificación de los vinos de la sesión
  const classById = new Map<string, string>()
  const classIds = wines
    .map((w) => w.classification_id)
    .filter((id): id is string => Boolean(id))
  if (classIds.length) {
    const { data } = await supabase
      .from("wine_classifications")
      .select("id,label_es")
      .in("id", classIds)
    for (const c of data ?? []) classById.set(c.id, c.label_es)
  }

  // notas de cata (nariz → olfato)
  const noteById = new Map<string, SenseNote>()
  if (wineIds.length) {
    const { data } = await supabase
      .from("tasting_notes")
      .select("wine_id,vista_es,nariz_es,boca_es")
      .in("wine_id", wineIds)
    for (const n of data ?? []) {
      noteById.set(n.wine_id, {
        vista: n.vista_es,
        olfato: n.nariz_es,
        gusto: n.boca_es,
      })
    }
  }

  // catálogo completo (orden estable) → distractores de la pregunta de clasificación
  const { data: cat } = await supabase
    .from("wine_classifications")
    .select("category,label_es")
    .eq("active", true)
    .order("category")
    .order("slug")
  const classCatalog: ClassEntry[] = (cat ?? []).map((c) => ({
    category: c.category,
    label: c.label_es,
  }))

  const enriched: EnrichedWine[] = wines.map((w) => ({
    ...w,
    classLabel: w.classification_id ? classById.get(w.classification_id) ?? null : null,
    note: noteById.get(w.id) ?? { vista: null, olfato: null, gusto: null },
  }))

  return { wines: enriched, classCatalog }
}

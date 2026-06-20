// quiz-bootstrap — al iniciar la Sala.
// In:  { code }
// Out: { settings, wines, questions }  ← SIN correctIndex (anti-spoiler).
//
// Estado: ESQUELETO. `settings` y `wines` están completos; `questions` lee de
// `game_questions` (hoy puede estar vacía). TODO(contrato): derivar las que
// falten de ficha+taxonomía (FR-12) y avisar con `wines_question_readiness`.

import { serviceClient } from "../_shared/supabase.ts"
import { fail, json, preflight, readJson } from "../_shared/http.ts"
import { resolveSessionWines } from "../_shared/wines.ts"

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre

  try {
    const { code } = await readJson<{ code?: string }>(req)
    if (!code || typeof code !== "string") return fail("missing_code")

    const supabase = serviceClient()

    // settings (§5.8): fila global (pack_tier null). TODO: override por pack_tier.
    const { data: settings } = await supabase
      .from("game_settings")
      .select(
        "time_vista_s,time_olfato_s,time_gusto_s,time_gamificacion_s,points_base,bonus_max",
      )
      .is("pack_tier", null)
      .maybeSingle()

    // vinos de la partida (el orden define el wineIndex)
    const wines = await resolveSessionWines(supabase, code)
    const wineIds = wines.map((w) => w.id)

    // labels de clasificación (§5.7): wines.classification_id → wine_classifications.label_es
    const classById = new Map<string, string>()
    const classIds = wines
      .map((w) => w.classification_id)
      .filter((id): id is string => Boolean(id))
    if (classIds.length) {
      const { data: classes } = await supabase
        .from("wine_classifications")
        .select("id,label_es")
        .in("id", classIds)
      for (const c of classes ?? []) classById.set(c.id, c.label_es)
    }

    // notas de cata (nada secreto): nariz → olfato
    const notesByWine = new Map<
      string,
      { vista: string | null; olfato: string | null; gusto: string | null }
    >()
    if (wineIds.length) {
      const { data: notes } = await supabase
        .from("tasting_notes")
        .select("wine_id,vista_es,nariz_es,boca_es")
        .in("wine_id", wineIds)
      for (const n of notes ?? []) {
        notesByWine.set(n.wine_id, {
          vista: n.vista_es,
          olfato: n.nariz_es,
          gusto: n.boca_es,
        })
      }
    }

    // preguntas SIN correct_answer (1 por fase sensorial + 1 de gamificación)
    // TODO(contrato): si falta alguna, derivarla de ficha+taxonomía (FR-12).
    const questions: {
      wineIndex: number
      fase: string
      prompt: string
      options: unknown
    }[] = []
    if (wineIds.length) {
      const { data: qs } = await supabase
        .from("game_questions")
        .select("wine_id,fase,text_es,options")
        .in("wine_id", wineIds)
        .eq("active", true)
      for (const q of qs ?? []) {
        const wineIndex = wineIds.indexOf(q.wine_id)
        if (wineIndex < 0) continue
        questions.push({
          wineIndex,
          fase: q.fase,
          prompt: q.text_es,
          options: q.options,
        })
      }
    }

    const winesOut = wines.map((w, wineIndex) => ({
      wineIndex,
      name: w.name,
      bodega: w.bodega,
      region: w.region_es,
      grape: w.grape,
      vintage: w.vintage,
      category: w.category,
      classification: w.classification_id
        ? classById.get(w.classification_id) ?? null
        : null,
      tasting: notesByWine.get(w.id) ?? { vista: null, olfato: null, gusto: null },
    }))

    return json({ settings, wines: winesOut, questions })
  } catch (e) {
    return fail((e as Error).message ?? "error", 400)
  }
})

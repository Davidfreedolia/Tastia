// quiz-close — al cerrar una pregunta (quiz→reveal). Valida + puntúa en backend.
// In:  { code, wineIndex, fase, answers: [{ playerId, optionIndex, seq }] }
// Out: { correctOptionIndex, awards, perPlayer }
//
// La respuesta correcta vive SOLO aquí. El host aplica `awards` al marcador.

import { serviceClient } from "../_shared/supabase.ts"
import { fail, json, preflight, readJson } from "../_shared/http.ts"
import { resolveSessionWines } from "../_shared/wines.ts"
import { computeAwards, type Answer } from "../_shared/scoring.ts"

type Body = {
  code?: string
  wineIndex?: number
  fase?: string
  answers?: Answer[]
}

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre

  try {
    const { code, wineIndex, fase, answers } = await readJson<Body>(req)
    if (!code) return fail("missing_code")
    if (typeof wineIndex !== "number") return fail("missing_wineIndex")
    if (!fase) return fail("missing_fase")
    const safeAnswers: Answer[] = Array.isArray(answers) ? answers : []

    const supabase = serviceClient()

    // parámetros de puntuación (§5.8) con fallback a los defaults del PRD
    const { data: settings } = await supabase
      .from("game_settings")
      .select("points_base,bonus_max")
      .is("pack_tier", null)
      .maybeSingle()
    const pointsBase = settings?.points_base ?? 100
    const bonusMax = settings?.bonus_max ?? 50

    // resolver el vino de esa posición y su pregunta de la fase
    const wines = await resolveSessionWines(supabase, code)
    const wine = wines[wineIndex]
    if (!wine) return fail("wine_not_found", 404)

    const { data: q } = await supabase
      .from("game_questions")
      .select("options,correct_answer")
      .eq("wine_id", wine.id)
      .eq("fase", fase)
      .eq("active", true)
      .maybeSingle()
    if (!q) return fail("question_not_found", 404)

    const options: unknown[] = Array.isArray(q.options) ? q.options : []
    const correctOptionIndex = options.findIndex((o) => o === q.correct_answer)

    const awards = computeAwards(safeAnswers, correctOptionIndex, pointsBase, bonusMax)
    const perPlayer = safeAnswers.map((a) => ({
      playerId: a.playerId,
      correct: a.optionIndex === correctOptionIndex,
    }))

    return json({ correctOptionIndex, awards, perPlayer })
  } catch (e) {
    return fail((e as Error).message ?? "error", 400)
  }
})

// quiz-close — al cerrar una pregunta (quiz→reveal). Valida + puntúa en backend.
// In:  { code, wineIndex, fase, answers: [{ playerId, optionIndex, seq }] }
// Out: { correctOptionIndex, awards, perPlayer }
//
// Usa la pregunta autorada de `game_questions` si existe; si no, DERIVA con el
// MISMO seed que quiz-bootstrap → mismo orden de opciones → mismo índice correcto.

import { serviceClient } from "../_shared/supabase.ts"
import { fail, json, preflight, readJson } from "../_shared/http.ts"
import { loadQuizContext } from "../_shared/quiz-context.ts"
import { deriveQuestion } from "../_shared/derive.ts"
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

    const { data: settings } = await supabase
      .from("game_settings")
      .select("points_base,bonus_max")
      .is("pack_tier", null)
      .maybeSingle()
    const pointsBase = settings?.points_base ?? 100
    const bonusMax = settings?.bonus_max ?? 50

    const ctx = await loadQuizContext(supabase, code)
    const wine = ctx.wines[wineIndex]
    if (!wine) return fail("wine_not_found", 404)

    // 1) pregunta autorada por el admin
    let correctOptionIndex = -1
    const { data: q } = await supabase
      .from("game_questions")
      .select("options,correct_answer")
      .eq("wine_id", wine.id)
      .eq("fase", fase)
      .eq("active", true)
      .maybeSingle()

    if (q) {
      const options: unknown[] = Array.isArray(q.options) ? q.options : []
      correctOptionIndex = options.findIndex((o) => o === q.correct_answer)
    } else {
      // 2) derivada (mismo seed que quiz-bootstrap)
      const d = deriveQuestion(ctx, wineIndex, fase)
      if (!d) return fail("question_not_derivable", 404)
      correctOptionIndex = d.correctIndex
    }

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

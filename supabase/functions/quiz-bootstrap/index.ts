// quiz-bootstrap — al iniciar la Sala.
// In:  { code }
// Out: { settings, wines, questions }  ← SIN correctIndex (anti-spoiler).
//
// Para cada (vino, fase): usa la pregunta autorada en `game_questions` si existe
// (§5.8 admin); si falta, la DERIVA de ficha+nota+taxonomía (FR-12). El host
// difunde por Realtime la pregunta activa (enunciado + opciones).

import { serviceClient } from "../_shared/supabase.ts"
import { fail, json, preflight, readJson } from "../_shared/http.ts"
import { loadQuizContext } from "../_shared/quiz-context.ts"
import { deriveQuestion } from "../_shared/derive.ts"

const FASES = ["vista", "olfato", "gusto", "gamificacion"] as const

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre

  try {
    const { code } = await readJson<{ code?: string }>(req)
    if (!code || typeof code !== "string") return fail("missing_code")

    const supabase = serviceClient()

    // settings (§5.8): fila global. TODO(contrato): override por pack_tier.
    const { data: settings } = await supabase
      .from("game_settings")
      .select(
        "time_vista_s,time_olfato_s,time_gusto_s,time_gamificacion_s,points_base,bonus_max",
      )
      .is("pack_tier", null)
      .maybeSingle()

    const ctx = await loadQuizContext(supabase, code)
    const wineIds = ctx.wines.map((w) => w.id)

    // preguntas autoradas por el admin (si las hay), indexadas por vino+fase
    const authored = new Map<string, { prompt: string; options: unknown }>()
    if (wineIds.length) {
      const { data } = await supabase
        .from("game_questions")
        .select("wine_id,fase,text_es,options")
        .in("wine_id", wineIds)
        .eq("active", true)
      for (const q of data ?? []) {
        authored.set(`${q.wine_id}:${q.fase}`, { prompt: q.text_es, options: q.options })
      }
    }

    const questions: {
      wineIndex: number
      fase: string
      prompt: string
      options: unknown
    }[] = []
    ctx.wines.forEach((w, wineIndex) => {
      for (const fase of FASES) {
        const a = authored.get(`${w.id}:${fase}`)
        if (a) {
          questions.push({ wineIndex, fase, prompt: a.prompt, options: a.options })
          continue
        }
        const d = deriveQuestion(ctx, wineIndex, fase)
        if (d) {
          // SIN correctIndex — anti-spoiler
          questions.push({ wineIndex, fase, prompt: d.prompt, options: d.options })
        }
      }
    })

    const wines = ctx.wines.map((w, wineIndex) => ({
      wineIndex,
      name: w.name,
      bodega: w.bodega,
      region: w.region_es,
      grape: w.grape,
      vintage: w.vintage,
      category: w.category,
      classification: w.classLabel,
      tasting: w.note,
    }))

    return json({ settings, wines, questions })
  } catch (e) {
    return fail((e as Error).message ?? "error", 400)
  }
})

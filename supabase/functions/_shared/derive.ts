import type { ClassEntry, EnrichedWine } from "./quiz-context.ts"

export type DerivedQuestion = {
  prompt: string
  options: string[]
  correctIndex: number
}

// Rotación de la pregunta de gamificación por vino (A6 del PRD).
const GAMI_ROTATION = ["variedad", "clasificacion", "precio"] as const

const FALLBACK_GRAPES = [
  "Tempranillo", "Garnacha", "Albariño", "Verdejo", "Macabeo",
  "Monastrell", "Bobal", "Mencía", "Cariñena", "Godello",
]

const PRICE_BANDS = ["Menos de 10 €", "10–20 €", "20–35 €", "Más de 35 €"]

const SENSE_PROMPT: Record<"vista" | "olfato" | "gusto", string> = {
  vista: "Observa el vino. ¿Cuál describe mejor su VISTA?",
  olfato: "Huele el vino. ¿Cuál describe mejor su NARIZ?",
  gusto: "Prueba el vino. ¿Cuál describe mejor su BOCA?",
}

function priceBand(cents: number | null): string {
  if (cents == null) return PRICE_BANDS[1]
  const eur = cents / 100
  if (eur < 10) return PRICE_BANDS[0]
  if (eur < 20) return PRICE_BANDS[1]
  if (eur < 35) return PRICE_BANDS[2]
  return PRICE_BANDS[3]
}

// PRNG determinista (mulberry32) sembrado por string → mismo orden de opciones
// en quiz-bootstrap y quiz-close para el mismo (vino, fase). CLAVE para que el
// correctOptionIndex que calcula quiz-close coincida con lo que vio el cliente.
function seeded(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function pickDistractors(
  pool: string[],
  correct: string,
  n: number,
  rng: () => number,
): string[] {
  const uniq = [...new Set(pool.filter((v) => v && v !== correct))]
  return shuffle(uniq, rng).slice(0, n)
}

// Distractores con preferencia: agota primero `primary` (p. ej. la misma
// categoría, FR-12) y solo completa con `fallback` si faltan. Cubre el caso de
// tipos con <4 clasificaciones (espumoso/rosado): se rellena con el resto.
function pickDistractorsPref(
  primary: string[],
  fallback: string[],
  correct: string,
  n: number,
  rng: () => number,
): string[] {
  const used = new Set([correct])
  const out: string[] = []
  for (const src of [primary, fallback]) {
    const cands = shuffle([...new Set(src.filter((v) => v && !used.has(v)))], rng)
    for (const c of cands) {
      if (out.length >= n) break
      out.push(c)
      used.add(c)
    }
    if (out.length >= n) break
  }
  return out
}

function finalize(
  prompt: string,
  correct: string,
  distractors: string[],
  rng: () => number,
): DerivedQuestion | null {
  if (distractors.length < 1) return null // sin distractores no hay pregunta válida
  const options = shuffle([correct, ...distractors], rng)
  return { prompt, options, correctIndex: options.indexOf(correct) }
}

/**
 * Deriva la pregunta de un (vino, fase) cuando no hay una autorada en
 * `game_questions` (FR-12). Determinista: misma entrada → mismo resultado.
 *
 * - Sensoriales (vista/olfato/gusto): la opción correcta es la nota de ESE vino;
 *   los distractores, las notas del mismo sentido de los otros vinos de la sesión.
 * - Gamificación: rota variedad → clasificación → precio por `wineIndex`.
 *
 * Devuelve null si no es derivable (p. ej. sin nota de cata) → el pack no está
 * "listo" para esa fase (lo refleja `wines_question_readiness`, FR-13).
 */
export function deriveQuestion(
  ctx: { wines: EnrichedWine[]; classCatalog: ClassEntry[] },
  wineIndex: number,
  fase: string,
): DerivedQuestion | null {
  const wine = ctx.wines[wineIndex]
  if (!wine) return null
  const rng = seeded(`${wine.id}:${fase}`)
  const others = ctx.wines.filter((_, i) => i !== wineIndex)

  if (fase === "vista" || fase === "olfato" || fase === "gusto") {
    const sense = fase
    const correct = wine.note[sense]
    if (!correct) return null
    const distractors = pickDistractors(
      others.map((w) => w.note[sense] ?? ""),
      correct,
      3,
      rng,
    )
    return finalize(SENSE_PROMPT[sense], correct, distractors, rng)
  }

  // gamificación
  const sub = GAMI_ROTATION[wineIndex % GAMI_ROTATION.length]

  if (sub === "variedad") {
    const correct = wine.grape
    if (!correct) return null
    const pool = [...others.map((w) => w.grape ?? ""), ...FALLBACK_GRAPES]
    return finalize("¿Qué variedad de uva es?", correct, pickDistractors(pool, correct, 3, rng), rng)
  }

  if (sub === "clasificacion") {
    const correct = wine.classLabel
    if (!correct) return null
    const sameCat = ctx.classCatalog
      .filter((c) => c.category === wine.category)
      .map((c) => c.label)
    const allLabels = ctx.classCatalog.map((c) => c.label)
    // Distractores de la MISMA categoría primero (FR-12); si hay <3 (espumoso/
    // rosado), se completa con el resto del catálogo.
    const distractors = pickDistractorsPref(sameCat, allLabels, correct, 3, rng)
    return finalize("¿Qué clasificación tiene este vino?", correct, distractors, rng)
  }

  // precio: siempre hay 4 bandas → 4 opciones garantizadas
  const correct = priceBand(wine.bottle_price_cents)
  const distractors = PRICE_BANDS.filter((b) => b !== correct)
  return finalize("¿Cuánto cuesta la botella?", correct, distractors, rng)
}

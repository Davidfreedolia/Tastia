export type Answer = { playerId: string; optionIndex: number; seq: number }

/**
 * Reparto de puntos (§5.5), movido al backend (A1 del contrato).
 *
 * Acierto = `pointsBase`; bonus de rapidez decreciente por ORDEN de llegada
 * (`seq`): el más rápido suma `bonusMax`, el último 0 (lineal). Fallar o no
 * responder = 0 (no aparece en el resultado).
 */
export function computeAwards(
  answers: Answer[],
  correctOptionIndex: number,
  pointsBase: number,
  bonusMax: number,
): Record<string, number> {
  const correct = answers
    .filter((a) => a.optionIndex === correctOptionIndex)
    .sort((a, b) => a.seq - b.seq)

  const awards: Record<string, number> = {}
  const n = correct.length
  correct.forEach((a, i) => {
    const bonus = n <= 1 ? bonusMax : Math.round(bonusMax * (1 - i / (n - 1)))
    awards[a.playerId] = pointsBase + bonus
  })
  return awards
}

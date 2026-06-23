// §5.6b · `quiz-close` — al cerrar una pregunta (quiz → reveal).
// In:  { code, wineIndex, fase, answers }  donde answers = { "<playerId>": { optionIndex, seq } }
// Out: { correctOptionIndex, correctLabel, awards: { "<playerId>": pts }, perPlayer: [{ playerId, correct }], revealedWine? }
//
// Recalcula la MISMA pregunta que sirvió bootstrap (mismo `code/wineIndex/fase` →
// `loadGame` determinista) para validar las respuestas y puntuar server-side (A1):
//   correctos ordenados por `seq` asc → points_base + max(0, bonus_max − puesto×BONUS_STEP).
// `revealedWine` solo en la última fase del vino (gamificacion).

import { json, preflight } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/client.ts";
import { loadGame, normalizeAnswers, revealedWineOf, BONUS_STEP, type Fase } from "../_shared/quiz.ts";

const VALID_FASES: readonly string[] = ["vista", "olfato", "gusto", "gamificacion"];

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "método no permitido" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const code = (body as { code?: unknown }).code;
    const wineIndex = (body as { wineIndex?: unknown }).wineIndex;
    const fase = (body as { fase?: unknown }).fase;
    const answersRaw = (body as { answers?: unknown }).answers;

    if (typeof code !== "string" || code.trim() === "") return json({ error: "code requerido" }, 400);
    if (typeof wineIndex !== "number" || !Number.isInteger(wineIndex) || wineIndex < 0) {
      return json({ error: "wineIndex inválido" }, 400);
    }
    if (typeof fase !== "string" || !VALID_FASES.includes(fase)) return json({ error: "fase inválida" }, 400);

    const sb = serviceClient();
    const game = await loadGame(sb, code.trim());

    const q = game.questions.find((x) => x.wineIndex === wineIndex && x.fase === (fase as Fase));
    if (!q || q.correctIndex < 0) {
      // Sin pregunta servible para ese (vino, fase): no se puntúa (el cliente hace su fallback).
      return json({ error: "pregunta no disponible" }, 404);
    }

    const answers = normalizeAnswers(answersRaw);

    // perPlayer: acierto/fallo de cada respuesta recibida (orden de inserción del mapa).
    const perPlayer = Object.entries(answers).map(([playerId, a]) => ({
      playerId,
      correct: a.optionIndex === q.correctIndex,
    }));

    // awards: solo los correctos, ordenados por llegada (seq asc); bonus decreciente por puesto.
    const correct = Object.entries(answers)
      .filter(([, a]) => a.optionIndex === q.correctIndex)
      .sort((a, b) => a[1].seq - b[1].seq);
    const awards: Record<string, number> = {};
    correct.forEach(([playerId], i) => {
      awards[playerId] = game.settings.points_base + Math.max(0, game.settings.bonus_max - i * BONUS_STEP);
    });

    const out: Record<string, unknown> = {
      correctOptionIndex: q.correctIndex,
      correctLabel: q.correctLabel,
      awards,
      perPlayer,
    };
    // Última fase del vino → ficha completa para el podio del vino.
    if (fase === "gamificacion") out.revealedWine = revealedWineOf(game.fichas[wineIndex]);

    return json(out);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

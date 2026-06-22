// §5.6b · `quiz-bootstrap` — al iniciar la Sala.
// In:  { code }
// Out: { settings, wines: [{ wineIndex }], questions: [{ wineIndex, fase, prompt, options }] }
//
// ANTI-SPOILER: se quita `correctIndex`/`correctLabel` antes de responder. La respuesta
// correcta NUNCA sale de la function. Si no hay vinos/preguntas en la BD, `questions` va
// vacío y el cliente cae a modo demo (todo-o-nada, por diseño).

import { json, preflight } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/client.ts";
import { loadGame } from "../_shared/quiz.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "método no permitido" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const code = (body as { code?: unknown }).code;
    if (typeof code !== "string" || code.trim() === "") {
      return json({ error: "code requerido" }, 400);
    }

    const sb = serviceClient();
    const game = await loadGame(sb, code.trim());

    return json({
      settings: game.settings,
      wines: game.fichas.map((f) => ({ wineIndex: f.wineIndex })),
      questions: game.questions.map((q) => ({
        wineIndex: q.wineIndex,
        fase: q.fase,
        prompt: q.prompt,
        options: q.options,
      })),
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

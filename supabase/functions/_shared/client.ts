// Cliente Supabase con SERVICE_ROLE para las edge functions. El service_role salta RLS:
// las functions son la ÚNICA vía por la que se leen las respuestas correctas
// (`game_questions.correct_answer`) y se escriben las sesiones (jugadores anónimos no
// pueden hacerlo directamente). NUNCA se devuelve la respuesta al cliente (anti-spoiler).
//
// `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta el runtime de Edge Functions.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno de la function");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

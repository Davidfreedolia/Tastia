import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2"

/**
 * Cliente con SERVICE_ROLE. Las edge functions son la única capa que lee datos
 * secretos (`game_questions.correct_answer`) y escribe sesiones; bypassa RLS.
 * `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase en runtime
 * (no hay que configurarlos a mano).
 */
export function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!url || !key) throw new Error("missing_supabase_env")
  return createClient(url, key, { auth: { persistSession: false } })
}

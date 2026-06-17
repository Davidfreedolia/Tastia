import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Public config (VITE_ prefix → readable on client). Never put service_role here.
// Env vars win when set; the literals are public fallbacks (the publishable key is
// meant to ship to the browser) so the app connects on any host even if the VITE_
// env vars aren't wired into the build.
const url =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  "https://tyuehzsqvjpjysxdihsh.supabase.co";
const key =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  "sb_publishable_bbbiniqe4sebYQcPufTg9A_H1hptMha";

/** True when the Supabase env vars are present. Routes use this to show a setup notice. */
export const supabaseConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

/**
 * Lazily creates a singleton browser Supabase client.
 * Returns null when env vars are missing (so the UI can degrade gracefully).
 */
export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  if (!client) {
    client = createClient(url!, key!, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return client;
}

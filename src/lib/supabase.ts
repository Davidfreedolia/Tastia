import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Public config (VITE_ prefix → readable on client). Never put service_role here.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

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

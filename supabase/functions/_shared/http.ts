import { corsHeaders } from "./cors.ts"

/** Respuesta JSON con CORS. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

/** Respuesta de error JSON `{ error }`. */
export function fail(message: string, status = 400): Response {
  return json({ error: message }, status)
}

/** Responde el preflight CORS (OPTIONS). Devuelve null si no es preflight. */
export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  return null
}

/** Lee y parsea el body JSON de un POST; lanza si no es válido. */
export async function readJson<T>(req: Request): Promise<T> {
  if (req.method !== "POST") throw new Error("method_not_allowed")
  try {
    return (await req.json()) as T
  } catch {
    throw new Error("invalid_json")
  }
}

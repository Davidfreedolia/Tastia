// CORS + helpers de respuesta para las edge functions públicas (las llaman clientes
// anónimos: la Sala/host y los jugadores, desde el navegador). `functions.invoke` de
// supabase-js hace un preflight OPTIONS, así que toda function debe responderlo y
// devolver las cabeceras CORS en cada respuesta.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Respuesta JSON con CORS. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Maneja el preflight OPTIONS. Devuelve `null` si no es OPTIONS (sigue el flujo normal). */
export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return null;
}

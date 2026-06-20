// CORS — los clientes (Sala/Companion) son navegadores anónimos que llaman a las
// funciones desde otro origen, así que necesitan estas cabeceras + responder al
// preflight OPTIONS.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

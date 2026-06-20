import type { SupabaseClient } from "jsr:@supabase/supabase-js@2"

export type WineRow = {
  id: string
  name: string
  bodega: string | null
  region_es: string | null
  grape: string | null
  vintage: number | null
  category: string | null
  classification_id: string | null
}

/**
 * Resuelve un `code` de sala a los vinos de la partida, EN ORDEN.
 *
 * TODO(contrato): confirmar con David las dos vías.
 *   1) REAL: `orders.access_code = code` → `order_wines` (por `position`) → `wines`.
 *   2) DEMO (`/room/TEST`, sin pedido): fallback a los primeros N vinos activos.
 *      ¿Set fijo de demo o cualquiera? Pendiente de cerrar.
 */
export async function resolveSessionWines(
  supabase: SupabaseClient,
  code: string,
  wineCount = 4,
): Promise<WineRow[]> {
  const { data: order } = await supabase
    .from("orders")
    .select("id")
    .eq("access_code", code)
    .maybeSingle()

  if (order) {
    const { data, error } = await supabase
      .from("order_wines")
      .select("position, wine:wines(*)")
      .eq("order_id", order.id)
      .order("position")
    if (error) throw error
    return (data ?? []).map((r: { wine: WineRow }) => r.wine)
  }

  // Fallback DEMO — pendiente de cerrar con David (set fijo vs. cualquiera).
  const { data, error } = await supabase
    .from("wines")
    .select("*")
    .eq("active", true)
    .order("created_at")
    .limit(wineCount)
  if (error) throw error
  return (data ?? []) as WineRow[]
}

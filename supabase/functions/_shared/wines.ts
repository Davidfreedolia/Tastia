import type { SupabaseClient } from "jsr:@supabase/supabase-js@2"

export type WineRow = {
  id: string
  name: string
  bodega: string | null
  region_es: string | null
  grape: string | null
  vintage: number | null
  bottle_price_cents: number | null
  category: string | null
  classification_id: string | null
}

/**
 * Resuelve un `code` de sala a los vinos de la partida, EN ORDEN.
 *
 * Dos vías (set de demo confirmado por David 20-jun: primeros N activos, se pule
 * luego si da tiempo):
 *   1) REAL: `orders.access_code = code` → `order_wines` (por `position`) → `wines`.
 *   2) DEMO (`/room/TEST`, sin pedido): primeros N vinos activos (orden estable
 *      por `created_at`).
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

  const { data, error } = await supabase
    .from("wines")
    .select("*")
    .eq("active", true)
    .order("created_at")
    .limit(wineCount)
  if (error) throw error
  return (data ?? []) as WineRow[]
}

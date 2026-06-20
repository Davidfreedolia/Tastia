// session-finish — en final_podium. Persiste la sesión (§5.9) + sube la foto del ganador.
// In:  { code, host_name, pack_tier, players: [{ playerId, name, points, position, photo? }] }
//      (`photo` = data-URL, solo el ganador)
// Out: { ok, session_id }
//
// Alimenta `ranking_mensual`. Escribe con service_role (los jugadores son anónimos).

import { serviceClient } from "../_shared/supabase.ts"
import { fail, json, preflight, readJson } from "../_shared/http.ts"

type Player = {
  playerId: string
  name: string
  points: number
  position: number
  photo?: string
}
type Body = {
  code?: string
  host_name?: string
  pack_tier?: string
  players?: Player[]
}

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre

  try {
    const { code, host_name, pack_tier, players } = await readJson<Body>(req)
    if (!code) return fail("missing_code")
    const roster: Player[] = Array.isArray(players) ? players : []

    const supabase = serviceClient()

    // order_id si el code corresponde a un pedido real (opcional)
    const { data: order } = await supabase
      .from("orders")
      .select("id")
      .eq("access_code", code)
      .maybeSingle()

    const { data: session, error: sErr } = await supabase
      .from("game_sessions")
      .insert({
        code,
        order_id: order?.id ?? null,
        pack_tier: pack_tier ?? null,
        host_name: host_name ?? null,
        player_count: roster.length,
        status: "finished",
        finished_at: new Date().toISOString(),
      })
      .select("id")
      .single()
    if (sErr) throw sErr
    const sessionId = session.id as string

    // foto del ganador (position === 1) → bucket winners
    const winner = roster.find((p) => p.position === 1)
    const winnerPhotoUrl = winner?.photo
      ? await uploadWinnerPhoto(supabase, sessionId, winner.playerId, winner.photo)
      : null

    const rows = roster.map((p) => ({
      session_id: sessionId,
      name: p.name,
      points: p.points,
      position: p.position,
      is_winner: p.position === 1,
      photo_url: p.position === 1 ? winnerPhotoUrl : null,
    }))
    const { error: pErr } = await supabase.from("game_session_players").insert(rows)
    if (pErr) throw pErr

    return json({ ok: true, session_id: sessionId })
  } catch (e) {
    return fail((e as Error).message ?? "error", 400)
  }
})

/** Decodifica una data-URL JPEG/PNG y la sube al bucket `winners`. Devuelve la URL pública. */
async function uploadWinnerPhoto(
  supabase: ReturnType<typeof serviceClient>,
  sessionId: string,
  playerId: string,
  dataUrl: string,
): Promise<string | null> {
  const match = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl)
  if (!match) return null
  const contentType = match[1]
  const ext = contentType.split("/")[1] ?? "jpg"
  const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0))
  const path = `${sessionId}/${playerId}.${ext}`

  const { error } = await supabase.storage
    .from("winners")
    .upload(path, bytes, { contentType, upsert: true })
  if (error) return null

  const { data } = supabase.storage.from("winners").getPublicUrl(path)
  return data.publicUrl
}

// §5.6b · `session-finish` — al entrar en `final_podium`.
// In:  { code, host_name, pack_tier, players: [{ playerId, name, points, position, photo? }] }
//      (`photo` = data-URL, SOLO del ganador). Out: { ok, session_id }.
//
// Persiste el RESULTADO (las partidas son efímeras): `game_sessions` + `game_session_players`,
// sube la foto del ganador al bucket `winners` y alimenta la vista `ranking_mensual`.
//
// Idempotencia (best-effort): el cliente no manda clave de idempotencia todavía
// (ver deferred-work §5.6b-B). Para evitar duplicar el ranking si el host re-monta el podio,
// se dedupe por (code, player_count) en una ventana corta y se devuelve la sesión existente.

import { json, preflight } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/client.ts";

const VALID_TIERS: readonly string[] = ["basico", "normal", "premium"];
const DEDUPE_WINDOW_MS = 15 * 60 * 1000;

type InPlayer = { playerId?: string; name?: string; points?: number; position?: number; photo?: string };

/** Decodifica un data-URL `data:image/...;base64,XXXX` → { bytes, contentType }. `null` si no es válido. */
function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; contentType: string } | null {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!m || !m[2]) return null; // solo base64
  const contentType = m[1] || "image/jpeg";
  try {
    const bin = atob(m[3]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { bytes, contentType };
  } catch {
    return null;
  }
}

function extFor(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "método no permitido" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const code = (body as { code?: unknown }).code;
    const hostName = (body as { host_name?: unknown }).host_name;
    const packTierRaw = (body as { pack_tier?: unknown }).pack_tier;
    const playersRaw = (body as { players?: unknown }).players;

    if (typeof code !== "string" || code.trim() === "") return json({ error: "code requerido" }, 400);
    if (!Array.isArray(playersRaw) || playersRaw.length === 0) {
      return json({ error: "players requerido" }, 400);
    }
    const packTier = typeof packTierRaw === "string" && VALID_TIERS.includes(packTierRaw) ? packTierRaw : null;
    const players = playersRaw as InPlayer[];

    const sb = serviceClient();

    // Idempotencia best-effort: ¿ya hay una sesión terminada de este code con el mismo nº de
    // jugadores en la ventana reciente? → devolverla (no duplicar el ranking).
    const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
    const { data: existing } = await sb
      .from("game_sessions")
      .select("id, player_count")
      .eq("code", code.trim())
      .eq("status", "finished")
      .gte("finished_at", since)
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing && existing.player_count === players.length) {
      return json({ ok: true, session_id: existing.id, deduped: true });
    }

    // 1) Cabecera de la sesión.
    const nowIso = new Date().toISOString();
    const { data: session, error: sErr } = await sb
      .from("game_sessions")
      .insert({
        code: code.trim(),
        pack_tier: packTier,
        host_name: typeof hostName === "string" ? hostName : null,
        wine_count: 4,
        player_count: players.length,
        status: "finished",
        finished_at: nowIso,
      })
      .select("id")
      .single();
    if (sErr || !session) {
      return json({ error: `no se pudo crear la sesión: ${sErr?.message ?? "desconocido"}` }, 500);
    }
    const sessionId = session.id as string;

    // 2) Jugadores. La foto del ganador (position 1) se sube al bucket `winners`.
    const rows = [];
    for (const p of players) {
      const position = typeof p.position === "number" ? p.position : null;
      const isWinner = position === 1;
      let photoUrl: string | null = null;

      if (isWinner && typeof p.photo === "string" && p.photo.startsWith("data:")) {
        const decoded = decodeDataUrl(p.photo);
        if (decoded) {
          const path = `${sessionId}/winner.${extFor(decoded.contentType)}`;
          const { error: upErr } = await sb.storage
            .from("winners")
            .upload(path, decoded.bytes, { contentType: decoded.contentType, upsert: true });
          if (!upErr) {
            photoUrl = sb.storage.from("winners").getPublicUrl(path).data.publicUrl;
          }
          // Si falla la subida, se persiste el jugador sin foto (best-effort, no rompe el guardado).
        }
      }

      rows.push({
        session_id: sessionId,
        name: typeof p.name === "string" ? p.name : "",
        points: typeof p.points === "number" ? p.points : 0,
        position,
        is_winner: isWinner,
        photo_url: photoUrl,
      });
    }

    const { error: pErr } = await sb.from("game_session_players").insert(rows);
    if (pErr) {
      // La cabecera ya existe; informamos del fallo de jugadores (recuperable manual).
      return json({ error: `sesión creada pero fallaron los jugadores: ${pErr.message}`, session_id: sessionId }, 500);
    }

    return json({ ok: true, session_id: sessionId });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

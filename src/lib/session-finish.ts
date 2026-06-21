// §5.6b-B — Lógica PURA (sin React/red) para armar el payload de `session-finish`.
// Se aísla aquí para testear orden/posición/ganador sin montar el hook ni tocar Supabase.
// La consume el efecto host-only de `use-room-channel.ts`, que lo invoca al entrar en
// `final_podium` (solo en modo BD) y se lo pasa a la edge function `session-finish` (§3 del
// contrato: in `{ code, host_name, pack_tier, players[] }`; out `{ ok, session_id }`).

/** Un jugador en el payload de fin de partida: posición 1-based por puntos; `photo` SOLO del ganador. */
export type FinishPlayer = {
  playerId: string;
  name: string;
  points: number;
  position: number;
  photo?: string;
};

/** Payload que recibe la edge function `session-finish` (alimenta §5.9 `ranking_mensual`). */
export type FinishPayload = {
  code: string;
  host_name: string;
  pack_tier: string | null;
  players: FinishPlayer[];
};

/**
 * Construye el payload de `session-finish` a partir del estado de la sala. PURO.
 *
 * Reglas (spec §5.6b-B):
 *  - Solo en modo BD: si `source !== "bd"` → `null` (no contaminar `ranking_mensual` con demo).
 *  - `players` = participantes con `!isHost` (el host/Sala NO es jugador), ordenados por
 *    `scores[id] ?? 0` DESC con orden ESTABLE (desempate por orden original de `participants`),
 *    mapeados a `{ playerId, name, points, position }` con `position` 1-based según ese orden.
 *  - La `photo` se añade SOLO al ganador (position === 1) tomándola de su `participant.photo`
 *    (privacidad + contrato: las demás NO se suben), y solo si la tiene.
 *  - Si no hay jugadores (solo host) → `null` (nada que persistir).
 *
 * `pack_tier`: el contrato lo pide, pero hoy las salas son solo `code` sin pack. Se envía `null`
 * y se coordina con Salvador (idealmente `quiz-bootstrap` devolverá el `pack_tier` de la sala →
 * se añadirá al `QuizSource` y se propagará aquí).
 */
export function buildFinishPayload(args: {
  code: string;
  hostName: string;
  participants: { id: string; name: string; isHost: boolean; photo?: string }[];
  scores: Record<string, number>;
  source: "bd" | "demo";
}): FinishPayload | null {
  const { code, hostName, participants, scores, source } = args;

  // Solo se persiste en modo BD (no contaminar el ranking con partidas demo/de muestra).
  if (source !== "bd") return null;

  // El host (Sala) NO es jugador: se excluye de `players[]`.
  const playersIn = participants.filter((p) => !p.isHost);

  // Orden ESTABLE por puntos DESC: se indexa primero para desempatar por orden original
  // (`Array.prototype.sort` no garantiza estabilidad entre claves iguales en todos los motores,
  // así que el índice original es el criterio de desempate explícito).
  const sorted = playersIn
    .map((p, index) => ({ p, index }))
    .sort((a, b) => {
      const sa = scores[a.p.id] ?? 0;
      const sb = scores[b.p.id] ?? 0;
      if (sb !== sa) return sb - sa; // mayor puntuación primero
      return a.index - b.index; // empate → orden original (estable)
    });

  const players: FinishPlayer[] = sorted.map(({ p }, i) => {
    const position = i + 1; // 1-based
    const player: FinishPlayer = {
      playerId: p.id,
      name: p.name,
      points: scores[p.id] ?? 0,
      position,
    };
    // Foto SOLO del ganador (position 1), si la tiene en presence Y puntuó (>0). Con todo a 0 la
    // UI no corona ganador, así que tampoco subimos foto (evita un "ganador" arbitrario en el ranking).
    if (position === 1 && p.photo && player.points > 0) player.photo = p.photo;
    return player;
  });

  // Sin jugadores (solo host) → nada que persistir.
  if (players.length === 0) return null;

  return { code, host_name: hostName, pack_tier: null, players };
}

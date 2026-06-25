import type { RoomState } from "@/lib/session";

/**
 * Clave derivada del `RoomState` para seleccionar el clip del sommelier.
 * Formato:
 *   - `lobby`
 *   - `playing:<fase>:<step>`  (p.ej. `playing:vista:quiz`)
 *   - `wine_podium`
 *   - `final_podium`
 */
export type ClipKey =
  | "lobby"
  | `playing:${RoomState["fase"]}:${RoomState["step"]}`
  | "wine_podium"
  | "final_podium";

export function clipKey(state: RoomState): ClipKey {
  switch (state.stage) {
    case "lobby":
      return "lobby";
    case "playing":
      return `playing:${state.fase}:${state.step}` as ClipKey;
    case "wine_podium":
      return "wine_podium";
    case "final_podium":
      return "final_podium";
  }
}

/**
 * URLs de los clips por fase. Rellenar con los enlaces de Supabase Storage
 * cuando estén disponibles. Una entrada vacía/ausente deja asomar el fondo
 * `play-bg` (sin vídeo).
 */
const BASE =
  "https://tyuehzsqvjpjysxdihsh.supabase.co/storage/v1/object/public/videos";

export const CLIPS: Partial<Record<ClipKey, string>> = {
  lobby: `${BASE}/Beronia_00_Bienvenida_Tasti.mp4`,
  "playing:vista:quiz": `${BASE}/Beronia_01_vista_explicacion.mp4`,
  "playing:vista:reveal": `${BASE}/Beronia_02_vista_reveal_introNariz.mp4`,
  "playing:olfato:quiz": `${BASE}/Beronia_03_nariz_explicacion.mp4`,
  "playing:olfato:reveal": `${BASE}/Beronia_04_nariz_reveal_introBoca.mp4`,
  "playing:gusto:quiz": `${BASE}/Beronia_05_boca_explicacion.mp4`,
  "playing:gusto:reveal": `${BASE}/Beronia_06_boca_reveal_introUva.mp4`,
  "playing:gamificacion:quiz": `${BASE}/Beronia_07_uva_explicacion.mp4`,
  "playing:gamificacion:reveal": `${BASE}/Beronia_08_uva_reveal_introClasif.mp4`,
  wine_podium: `${BASE}/Beronia_10_vino_reveal_ficha.mp4`,
  final_podium: `${BASE}/Beronia_11_cierre.mp4`,
  // Sin slot en la máquina actual (fase gamificación = 1 pregunta): se reservaría
  // para `clasifprecio` si en el futuro se divide la fase de gamificación.
  // 09 → Beronia_09_clasifprecio_explicacion.mp4
};

export function clipUrlFor(state: RoomState): string | undefined {
  return CLIPS[clipKey(state)];
}

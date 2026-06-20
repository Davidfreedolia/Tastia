// Taxonomía de vinos (§5.7 / FR-14). Estructura TIPADA en código: cada tipo de vino
// (tinto/blanco/rosado/espumoso/cava) tiene su lista de clasificaciones posibles, derivada
// de la jerarquía del PRD §5.7. Es la FUENTE ÚNICA de la pregunta de "clasificación": la
// respuesta correcta es la `classification` del vino y los distractores son OTRAS
// clasificaciones del MISMO `type` (hermanos coherentes), nunca cross-tipo.
//
// La persistencia del `type`/`classification` en la tabla `wines` (BD) y su gestión en
// `/admin` se hacen en §5.6/§5.8; aquí vive solo la taxonomía en código + vinos demo.

/** Tipo de vino (raíz de la taxonomía §5.7). */
export type WineType = "tinto" | "blanco" | "rosado" | "espumoso" | "cava";

/**
 * Clasificaciones posibles por tipo de vino (jerarquía del PRD §5.7 / FR-14). Cada lista
 * es el conjunto de "hermanos" del que sale la pregunta de clasificación de ese tipo.
 */
export const WINE_TAXONOMY: Record<WineType, string[]> = {
  tinto: ["joven", "cosecha", "roble", "crianza", "reserva", "gran reserva"],
  blanco: [
    "joven",
    "barrica",
    "crianza",
    "reserva",
    "gran reserva",
    "sobre lías",
    "depósito inerte",
    "velo de flor",
  ],
  rosado: ["joven", "roble", "sobre lías"],
  espumoso: ["blanco", "rosado"],
  cava: [
    "crianza",
    "reserva",
    "gran reserva",
    "paraje calificado",
    "brut nature",
    "extra brut",
    "seco",
  ],
};

/** Clasificaciones de un tipo de vino (copia, para no exponer el array interno). */
export function classificationsFor(type: WineType): string[] {
  return WINE_TAXONOMY[type].slice();
}

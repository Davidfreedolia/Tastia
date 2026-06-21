// §5.8c — Lógica PURA de la clasificación de vinos: sin I/O, sin React.
// Define las categorías (`wine_category`), filtra las clasificaciones por categoría
// (solo `active`) y valida la coherencia tipo↔clasificación. La UI deriva el select de
// clasificación de la categoría elegida; `isPairingValid` lo reasegura en código (defensa),
// para no guardar nunca una clasificación de otra categoría.

import type { Database } from "./database.types";

/** Categorías de vino (enum `wine_category` de la BD). */
export const WINE_CATEGORIES = ["tinto", "blanco", "rosado", "espumoso", "cava"] as const;

export type WineCategory = (typeof WINE_CATEGORIES)[number];

/**
 * Clasificación tal como la usamos para filtrar/validar. Es un subconjunto de la fila de
 * `wine_classifications` (basta con `id`, `category`, `label_es` y `active`).
 */
export type ClassificationOption = {
  id: string;
  category: WineCategory;
  label_es: string;
  active: boolean;
};

/**
 * Clasificaciones ofrecibles para una categoría: solo las `active` cuya `category` coincide.
 * Si `category` es null/"" (sin categoría elegida) → [] (no hay clasificación coherente posible).
 */
export function classificationsFor(
  classifications: ClassificationOption[],
  category: WineCategory | null | "",
): ClassificationOption[] {
  if (!category) return [];
  return classifications.filter((c) => c.active && c.category === category);
}

/**
 * ¿La pareja (categoría, clasificación) es coherente para guardar?
 *  - `classification_id` null/"" (sin clasificar) → true.
 *  - en otro caso: debe existir una clasificación con ese id Y su `category === category`.
 *  - id inexistente o de otra categoría → false.
 *
 * Nota: NO exige que la clasificación esté `active` (un vino podría conservar una clasificación
 * que luego se desactivó, mientras la categoría siga cuadrando); la oferta del select sí filtra
 * por `active` vía `classificationsFor`.
 */
export function isPairingValid(
  classifications: ClassificationOption[],
  category: WineCategory | null | "",
  classification_id: string | null | "",
): boolean {
  if (!classification_id) return true;
  const match = classifications.find((c) => c.id === classification_id);
  return Boolean(match && category && match.category === category);
}

/** Fila completa de `wine_classifications` (referencia para la UI). */
export type WineClassificationRow = Database["public"]["Tables"]["wine_classifications"]["Row"];

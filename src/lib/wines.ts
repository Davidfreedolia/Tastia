// Ficha de los vinos de la cata. El contenido del quiz (§5.2) se acopla sobre estos datos.
// Nota: vive solo en el chunk de la Sala (/room) para no filtrar las respuestas al
// cliente del jugador; en producción esto debería resolverse en el servidor.
//
// El scoring por texto libre (`scoreGuess`) quedó superado al pasar a la máquina de
// estados por fases (§5.1); el reparto real de puntos lo define §5.5.

/** Ficha de un vino. */
export type Wine = {
  index: number; // 0..WINE_COUNT-1
  name: string;
  bodega: string;
  region: string; // D.O.
  grape: string; // variedad
  priceRange: string; // p. ej. "10-25€"
  vintage: number;
  note: string; // curiosidad / nota de cata
};

// PLACEHOLDER — pack de muestra (Winelover). Sustituir por los 4 vinos reales de la cata.
export const DEMO_WINES: Wine[] = [
  {
    index: 0,
    name: "Honoro Vera",
    bodega: "Bodegas Juan Gil",
    region: "Jumilla",
    grape: "Monastrell",
    priceRange: "10-25€",
    vintage: 2022,
    note: "Monastrell de secano, potente y frutal. Sorprende por su relación calidad-precio.",
  },
  {
    index: 1,
    name: "Ramón Bilbao Crianza",
    bodega: "Bodegas Ramón Bilbao",
    region: "Rioja",
    grape: "Tempranillo",
    priceRange: "10-25€",
    vintage: 2020,
    note: "El Rioja de manual: fruta roja y un punto de vainilla por la crianza en roble.",
  },
  {
    index: 2,
    name: "Pazo de Señorans",
    bodega: "Pazo de Señorans",
    region: "Rías Baixas",
    grape: "Albariño",
    priceRange: "10-25€",
    vintage: 2023,
    note: "Albariño atlántico, salino y cítrico. El blanco que descoloca a quien espera tinto.",
  },
  {
    index: 3,
    name: "Las Gravas",
    bodega: "Casa Castillo",
    region: "Jumilla",
    grape: "Garnacha",
    priceRange: "25-40€",
    vintage: 2019,
    note: "Garnacha de viñas viejas sobre suelos de grava. El 'caprichito' que sube el listón.",
  },
];

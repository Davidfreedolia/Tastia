import type { Guess, Wine } from "./session";

// PLACEHOLDER — pack de muestra (Winelover). Sustituir por los 4 vinos reales de la cata.
// Nota: vive solo en el chunk de la Sala (/room) para no filtrar las respuestas al
// cliente del jugador; en producción esto debería resolverse en el servidor.
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

const norm = (s?: string) => (s ?? "").trim().toLowerCase();

/** Puntúa una apuesta contra la ficha real del vino. */
export function scoreGuess(guess: Guess, wine: Wine): number {
  let pts = 0;
  if (guess.grape && norm(wine.grape).includes(norm(guess.grape))) pts += 20; // variedad
  if (guess.region && norm(wine.region).includes(norm(guess.region))) pts += 30; // D.O.
  if (guess.priceRange && norm(guess.priceRange) === norm(wine.priceRange)) pts += 15; // precio
  const v = parseInt((guess.vintage ?? "").replace(/\D/g, ""), 10);
  if (!Number.isNaN(v) && Math.abs(v - wine.vintage) <= 1) pts += 25; // añada ±1
  return pts;
}

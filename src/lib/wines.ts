// Ficha de los vinos de la cata. El contenido del quiz (§5.2) se acopla sobre estos datos.
// Nota: vive solo en el chunk de la Sala (/room) para no filtrar las respuestas al
// cliente del jugador; en producción esto debería resolverse en el servidor.
//
// El scoring por texto libre (`scoreGuess`) quedó superado al pasar a la máquina de
// estados por fases (§5.1); el reparto real de puntos lo define §5.5.
//
// §5.2: cada vino lleva una NOTA DE CATA estructurada (vista/olfato/gusto) de la que se
// derivan las preguntas sensoriales; la pregunta de gamificación sale de la ficha
// (variedad/clasificación/precio, rotando por `wineIndex`). `getQuestion(i,f)` es
// DETERMINISTA: mismo enunciado y mismo orden de opciones en todos los clientes, de modo
// que Sala y Companion la pintan igual sin difundir la Pregunta en `RoomState`.

import type { Fase, Question } from "./session";

/** Nota de cata estructurada de un vino (fuente de las preguntas sensoriales). */
export type TastingNote = {
  vista: string; // color / aspecto visual
  olfato: string; // aroma dominante
  gusto: string; // sensación en boca
};

/** Ficha de un vino. */
export type Wine = {
  index: number; // 0..WINE_COUNT-1
  name: string;
  bodega: string;
  region: string; // D.O.
  grape: string; // variedad
  priceRange: string; // p. ej. "10-25€"
  classification: string; // clasificación / tipo (p. ej. "Crianza", "Joven")
  vintage: number;
  note: string; // curiosidad / nota de cata (texto libre)
  tasting: TastingNote; // nota de cata estructurada (§5.2)
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
    classification: "Joven",
    vintage: 2022,
    note: "Monastrell de secano, potente y frutal. Sorprende por su relación calidad-precio.",
    tasting: {
      vista: "Rojo picota intenso",
      olfato: "Fruta negra madura",
      gusto: "Potente y carnoso",
    },
  },
  {
    index: 1,
    name: "Ramón Bilbao Crianza",
    bodega: "Bodegas Ramón Bilbao",
    region: "Rioja",
    grape: "Tempranillo",
    priceRange: "10-25€",
    classification: "Crianza",
    vintage: 2020,
    note: "El Rioja de manual: fruta roja y un punto de vainilla por la crianza en roble.",
    tasting: {
      vista: "Rojo rubí con ribete teja",
      olfato: "Fruta roja y vainilla",
      gusto: "Redondo y especiado",
    },
  },
  {
    index: 2,
    name: "Pazo de Señorans",
    bodega: "Pazo de Señorans",
    region: "Rías Baixas",
    grape: "Albariño",
    priceRange: "10-25€",
    classification: "Blanco joven",
    vintage: 2023,
    note: "Albariño atlántico, salino y cítrico. El blanco que descoloca a quien espera tinto.",
    tasting: {
      vista: "Amarillo pajizo con reflejos verdosos",
      olfato: "Cítricos y flores blancas",
      gusto: "Fresco y salino",
    },
  },
  {
    index: 3,
    name: "Las Gravas",
    bodega: "Casa Castillo",
    region: "Jumilla",
    grape: "Garnacha",
    priceRange: "25-40€",
    classification: "Vino de guarda",
    vintage: 2019,
    note: "Garnacha de viñas viejas sobre suelos de grava. El 'caprichito' que sube el listón.",
    tasting: {
      vista: "Granate profundo",
      olfato: "Especias y monte bajo",
      gusto: "Mineral y elegante",
    },
  },
];

/** Las 3 propiedades de la ficha que rotan en la fase de gamificación. */
const GAMIFICACION_KEYS = ["grape", "classification", "priceRange"] as const;
type GamificacionKey = (typeof GAMIFICACION_KEYS)[number];

const GAMIFICACION_PROMPT: Record<GamificacionKey, string> = {
  grape: "¿Qué variedad de uva es este vino?",
  classification: "¿Cuál es la clasificación de este vino?",
  priceRange: "¿En qué rango de precio está este vino?",
};

const SENSORIAL_PROMPT: Record<Exclude<Fase, "gamificacion">, string> = {
  vista: "¿Qué describe mejor su aspecto visual?",
  olfato: "¿Qué aroma domina en nariz?",
  gusto: "¿Qué describe mejor su paso en boca?",
};

/**
 * PRNG determinista (mulberry32). Dada una misma semilla produce siempre la misma
 * secuencia: así Sala y Companion barajan las opciones igual sin difundir la Pregunta.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FASE_SEED: Record<Fase, number> = { vista: 1, olfato: 2, gusto: 3, gamificacion: 4 };

/** Semilla determinista a partir de `(wineIndex, fase)`. */
function seedFor(wineIndex: number, fase: Fase): number {
  return (wineIndex + 1) * 100 + FASE_SEED[fase];
}

/**
 * Baraja determinista (Fisher–Yates con PRNG sembrado). Devuelve `items` permutados y
 * el nuevo índice de la opción correcta tras la permutación.
 */
function deterministicShuffle(items: string[], correctValue: string, seed: number): {
  options: string[];
  correctIndex: number;
} {
  const rng = mulberry32(seed);
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return { options: arr, correctIndex: arr.indexOf(correctValue) };
}

/**
 * Pool de distractores plausibles para una fase: valores del MISMO atributo en los otros
 * vinos del catálogo, sin duplicar el correcto. Recorrido determinista (orden del catálogo).
 */
function distractorPool(
  wineIndex: number,
  correctValue: string,
  pick: (w: Wine) => string,
): string[] {
  const seen = new Set<string>([correctValue]);
  const pool: string[] = [];
  // Empezamos por los vinos siguientes (rotación estable) para variar entre preguntas.
  for (let k = 1; k < DEMO_WINES.length; k++) {
    const w = DEMO_WINES[(wineIndex + k) % DEMO_WINES.length];
    const v = pick(w);
    if (!seen.has(v)) {
      seen.add(v);
      pool.push(v);
    }
  }
  return pool;
}

/** Valor correcto + extractor del atributo según la fase. */
function correctFor(wine: Wine, fase: Fase): { value: string; pick: (w: Wine) => string; prompt: string } {
  if (fase === "gamificacion") {
    // Rota variedad/clasificación/precio por `wineIndex` (determinista).
    const key = GAMIFICACION_KEYS[wine.index % GAMIFICACION_KEYS.length];
    return { value: wine[key], pick: (w) => w[key], prompt: GAMIFICACION_PROMPT[key] };
  }
  const pick = (w: Wine) => w.tasting[fase];
  return { value: wine.tasting[fase], pick, prompt: SENSORIAL_PROMPT[fase] };
}

/**
 * Pools CURADOS de distractores plausibles por atributo (valores reales de vino español).
 * Sirven para COMPLETAR cuando el catálogo no aporta 3 distractores únicos: así siempre hay
 * 4 opciones distintas y verosímiles, sin delatar la respuesta con un "(variante N)".
 */
const FALLBACK_POOLS = {
  grape: [
    "Tempranillo",
    "Garnacha",
    "Albariño",
    "Verdejo",
    "Monastrell",
    "Cabernet Sauvignon",
    "Mencía",
    "Bobal",
    "Godello",
    "Syrah",
  ],
  classification: ["Joven", "Crianza", "Reserva", "Gran Reserva", "Roble", "Vino de guarda", "Blanco joven"],
  priceRange: ["<10€", "10-25€", "25-40€", "40-60€", ">60€"],
  // Descriptores sensoriales breves y plausibles por sentido.
  vista: [
    "Rojo picota intenso",
    "Rojo rubí con ribete teja",
    "Granate profundo",
    "Amarillo pajizo con reflejos verdosos",
    "Dorado brillante",
    "Cereza con borde violáceo",
  ],
  olfato: [
    "Fruta negra madura",
    "Fruta roja y vainilla",
    "Cítricos y flores blancas",
    "Especias y monte bajo",
    "Notas tostadas y cacao",
    "Frutas tropicales",
  ],
  gusto: [
    "Potente y carnoso",
    "Redondo y especiado",
    "Fresco y salino",
    "Mineral y elegante",
    "Suave y afrutado",
    "Amplio y persistente",
  ],
} satisfies Record<string, readonly string[]>;

/** Pool curado que toca según la fase (en gamificación, según el atributo que rota). */
function fallbackPoolFor(wine: Wine, fase: Fase): readonly string[] {
  if (fase === "gamificacion") {
    return FALLBACK_POOLS[GAMIFICACION_KEYS[wine.index % GAMIFICACION_KEYS.length]];
  }
  return FALLBACK_POOLS[fase];
}

/**
 * Pregunta DETERMINISTA de la fase `fase` para el vino `wineIndex` (§5.2).
 *
 * - Sensoriales (vista/olfato/gusto): correcta = nota de cata estructurada de ese sentido.
 * - Gamificación: correcta = ficha, rotando variedad→clasificación→precio por `wineIndex`.
 * - 3 distractores: mismo atributo de otros vinos del catálogo (pool plausible).
 * - Orden de opciones barajado con seed `wineIndex+fase` → mismo orden en todos los clientes.
 *
 * No viaja en `RoomState`: ambos lados la derivan llamando a esta función con el estado.
 */
export function getQuestion(wineIndex: number, fase: Fase): Question {
  const wine = DEMO_WINES[wineIndex] ?? DEMO_WINES[0];
  const { value, pick, prompt } = correctFor(wine, fase);

  // Distractores: primero los del catálogo (mismo atributo de otros vinos) y, si no llegan
  // a 3, se completan con el pool CURADO de la fase. Dedup contra el correcto y entre sí; se
  // toman 3. Recorrido determinista → mismo set/orden en todos los clientes para un `(i,f)`.
  const distractors: string[] = [];
  const seen = new Set<string>([value]);
  for (const v of [...distractorPool(wine.index, value, pick), ...fallbackPoolFor(wine, fase)]) {
    if (distractors.length >= 3) break;
    if (seen.has(v)) continue;
    seen.add(v);
    distractors.push(v);
  }

  const { options, correctIndex } = deterministicShuffle(
    [value, ...distractors],
    value,
    seedFor(wine.index, fase),
  );

  return { fase, prompt, options, correctIndex };
}

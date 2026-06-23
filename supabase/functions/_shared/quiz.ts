// Núcleo del juego en el backend (§5.6b). Lo comparten `quiz-bootstrap` (sirve las
// preguntas SIN respuesta) y `quiz-close` (puntúa + revela). La clave del contrato:
//
//   bootstrap y close DEBEN producir EXACTAMENTE las mismas `options` (mismo orden) para
//   un `(code, wineIndex, fase)` dado, porque el cliente cierra con el `optionIndex` que
//   eligió sobre las opciones que sirvió bootstrap. Por eso TODO es DETERMINISTA: misma
//   resolución de vinos, misma selección de pregunta, mismo barajado sembrado. `loadGame`
//   construye el set completo una vez; bootstrap quita la respuesta, close la usa.
//
// Dos fuentes de preguntas, por (vino, fase):
//   1) BANCO: `game_questions` (activa) editada por el admin → se sirve tal cual (sin barajar).
//   2) DERIVADA (FR-12): si no hay banco, se deriva de la ficha + taxonomía con el MISMO
//      algoritmo que el modo demo del cliente (`src/lib/wines.ts`), para que un pack recién
//      importado (vinos + notas + clasificaciones, sin banco manual) ya juegue en modo BD.
//
// Anti-spoiler: la respuesta correcta vive SOLO aquí (service_role). `correctIndex`/
// `correctLabel` NUNCA salen en `quiz-bootstrap`.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type Fase = "vista" | "olfato" | "gusto" | "gamificacion";
export const FASES: readonly Fase[] = ["vista", "olfato", "gusto", "gamificacion"];

export type QuizSettings = {
  time_vista_s: number;
  time_olfato_s: number;
  time_gusto_s: number;
  time_gamificacion_s: number;
  points_base: number;
  bonus_max: number;
};

/** Pregunta con la respuesta (uso INTERNO). bootstrap la sirve sin `correctIndex`/`correctLabel`. */
export type ServerQuestion = {
  wineIndex: number;
  fase: Fase;
  prompt: string;
  options: string[];
  correctIndex: number; // índice de la opción correcta en `options` (-1 si no derivable)
  correctLabel: string;
};

/** Ficha de un vino del pack, normalizada para derivar preguntas y el reveal. */
export type WineFicha = {
  id: string;
  wineIndex: number;
  name: string;
  bodega: string | null;
  region: string | null;
  grape: string | null;
  vintage: number | null;
  priceBucket: string;
  category: string | null; // wine_category
  classificationLabel: string | null;
  curiosidad: string | null;
  tasting: { vista: string | null; olfato: string | null; gusto: string | null };
};

export type Game = {
  settings: QuizSettings;
  fichas: WineFicha[];
  questions: ServerQuestion[];
};

const DEFAULT_SETTINGS: QuizSettings = {
  time_vista_s: 30,
  time_olfato_s: 30,
  time_gusto_s: 45,
  time_gamificacion_s: 30,
  points_base: 100,
  bonus_max: 50,
};

/** Bonus de rapidez: cuánto baja por cada puesto (mín. 0). Constante (paridad con el cliente). */
export const BONUS_STEP = 10;

// ───────────────────────── Derivación determinista (puerto de src/lib/wines.ts) ─────────────────────────

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
function seedFor(wineIndex: number, fase: Fase): number {
  return (wineIndex + 1) * 100 + FASE_SEED[fase];
}

function deterministicShuffle(items: string[], correctValue: string, seed: number) {
  const rng = mulberry32(seed);
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return { options: arr, correctIndex: arr.indexOf(correctValue) };
}

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

// Pools curados de respaldo (idénticos a src/lib/wines.ts) para COMPLETAR cuando el pack no
// aporta 3 distractores únicos. La clasificación NO usa pool: sus distractores son hermanos
// del mismo tipo (taxonomía), que se calculan aparte.
const FALLBACK_POOLS: Record<string, readonly string[]> = {
  grape: ["Tempranillo", "Garnacha", "Albariño", "Verdejo", "Monastrell",
    "Cabernet Sauvignon", "Mencía", "Bobal", "Godello", "Syrah"],
  priceRange: ["<10€", "10-25€", "25-40€", "40-60€", ">60€"],
  vista: ["Rojo picota intenso", "Rojo rubí con ribete teja", "Granate profundo",
    "Amarillo pajizo con reflejos verdosos", "Dorado brillante", "Cereza con borde violáceo"],
  olfato: ["Fruta negra madura", "Fruta roja y vainilla", "Cítricos y flores blancas",
    "Especias y monte bajo", "Notas tostadas y cacao", "Frutas tropicales"],
  gusto: ["Potente y carnoso", "Redondo y especiado", "Fresco y salino",
    "Mineral y elegante", "Suave y afrutado", "Amplio y persistente"],
};

function gamificacionKeyFor(wineIndex: number): GamificacionKey {
  return GAMIFICACION_KEYS[wineIndex % GAMIFICACION_KEYS.length];
}

/**
 * Valor del atributo que pregunta `(fase, gamiKey)` en una ficha CUALQUIERA. Para distractores,
 * `gamiKey` es el de la PREGUNTA (el del vino preguntado), NO la rotación de la ficha de la que se
 * extrae el distractor — así "¿qué variedad?" toma variedades de los otros vinos, no su
 * clasificación/precio (paridad con `getQuestion` de `src/lib/wines.ts`). `null` si falta el dato.
 */
function attrValue(ficha: WineFicha, fase: Fase, gamiKey: GamificacionKey | null): string | null {
  if (fase !== "gamificacion") return ficha.tasting[fase];
  if (gamiKey === "grape") return ficha.grape;
  if (gamiKey === "classification") return ficha.classificationLabel;
  return ficha.priceBucket;
}

function fallbackPoolFor(fase: Fase, gamiKey: GamificacionKey | null): readonly string[] {
  if (fase === "gamificacion") {
    return gamiKey === "classification" ? [] : (FALLBACK_POOLS[gamiKey!] ?? []);
  }
  return FALLBACK_POOLS[fase] ?? [];
}

/**
 * Pregunta DERIVADA de la ficha + taxonomía para `(wineIndex, fase)`. Mismo algoritmo que
 * `getQuestion` del cliente: pool de distractores del MISMO atributo en los otros vinos del
 * pack (rotación estable desde `wineIndex+1`) + pool curado de respaldo; para CLASIFICACIÓN,
 * hermanos del mismo tipo (`classifSiblings`). Barajado con seed `(wineIndex,fase)`.
 * Devuelve `null` si no hay valor correcto (ficha incompleta) → esa pregunta no se sirve.
 */
function deriveQuestion(
  fichas: WineFicha[],
  wineIndex: number,
  fase: Fase,
  classifSiblings: (category: string, exclude: string) => string[],
): ServerQuestion | null {
  const ficha = fichas[wineIndex];
  if (!ficha) return null;
  // Clave de gamificación de la PREGUNTA (la del vino preguntado). Se usa también para extraer el
  // MISMO atributo de los otros vinos como distractores (no la rotación propia de cada uno).
  const gamiKey = fase === "gamificacion" ? gamificacionKeyFor(wineIndex) : null;
  const value = attrValue(ficha, fase, gamiKey);
  if (!value) return null; // ficha incompleta para esta fase → sin pregunta derivable

  const isClasif = gamiKey === "classification";
  const prompt = fase === "gamificacion" ? GAMIFICACION_PROMPT[gamiKey!] : SENSORIAL_PROMPT[fase];

  let distractorSource: string[];
  if (isClasif) {
    distractorSource = ficha.category ? classifSiblings(ficha.category, value) : [];
  } else {
    // MISMO atributo (el de la pregunta) de los OTROS vinos del pack (rotación estable) + pool curado.
    const fromPack: string[] = [];
    for (let k = 1; k < fichas.length; k++) {
      const other = fichas[(wineIndex + k) % fichas.length];
      const v = attrValue(other, fase, gamiKey);
      if (v) fromPack.push(v);
    }
    distractorSource = [...fromPack, ...fallbackPoolFor(fase, gamiKey)];
  }

  // Dedup contra el correcto y entre sí; tomar 3.
  const distractors: string[] = [];
  const seen = new Set<string>([value]);
  for (const v of distractorSource) {
    if (distractors.length >= 3) break;
    if (seen.has(v)) continue;
    seen.add(v);
    distractors.push(v);
  }

  const { options, correctIndex } = deterministicShuffle([value, ...distractors], value, seedFor(wineIndex, fase));
  return { wineIndex, fase, prompt, options, correctIndex, correctLabel: value };
}

// ───────────────────────── Carga desde la BD ─────────────────────────

function priceBucket(cents: number | null): string {
  if (cents == null) return "10-25€";
  const e = cents / 100;
  if (e < 10) return "<10€";
  if (e < 25) return "10-25€";
  if (e < 40) return "25-40€";
  if (e < 60) return "40-60€";
  return ">60€";
}

/** Resuelve los wine_ids (en orden de cata) y el pack_tier para un `code`. */
async function resolveWines(
  sb: SupabaseClient,
  code: string,
): Promise<{ wineIds: string[]; packTier: string | null }> {
  // 1) Pedido pagado con ese access_code → sus vinos en orden de `position`.
  const { data: order } = await sb
    .from("orders")
    .select("id")
    .eq("access_code", code)
    .limit(1)
    .maybeSingle();

  if (order?.id) {
    const { data: ow } = await sb
      .from("order_wines")
      .select("wine_id, position, pack_tier_id")
      .eq("order_id", order.id)
      .order("position", { ascending: true });
    if (ow && ow.length > 0) {
      // Banda del pack (para settings por gama). En 2 pasos, sin embed PostgREST.
      let packTier: string | null = null;
      const tierId = ow[0].pack_tier_id as string | null;
      if (tierId) {
        const { data: tier } = await sb
          .from("pack_tiers")
          .select("band")
          .eq("id", tierId)
          .maybeSingle();
        packTier = (tier?.band as string) ?? null;
      }
      return { wineIds: ow.map((r) => r.wine_id as string), packTier };
    }
  }

  // 2) Fallback (códigos de prueba como "TEST", o sin order_wines aún): 4 vinos activos,
  //    orden determinista (mismo set en bootstrap y close).
  const { data: wines } = await sb
    .from("wines")
    .select("id")
    .eq("active", true)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(4);
  return { wineIds: (wines ?? []).map((w) => w.id as string), packTier: null };
}

async function loadSettings(sb: SupabaseClient, packTier: string | null): Promise<QuizSettings> {
  const { data: rows } = await sb.from("game_settings").select("*").eq("active", true);
  if (!rows || rows.length === 0) return DEFAULT_SETTINGS;
  const tierRow = packTier ? rows.find((r) => r.pack_tier === packTier) : undefined;
  const global = rows.find((r) => r.pack_tier == null);
  const r = tierRow ?? global ?? rows[0];
  return {
    time_vista_s: Number(r.time_vista_s) || DEFAULT_SETTINGS.time_vista_s,
    time_olfato_s: Number(r.time_olfato_s) || DEFAULT_SETTINGS.time_olfato_s,
    time_gusto_s: Number(r.time_gusto_s) || DEFAULT_SETTINGS.time_gusto_s,
    time_gamificacion_s: Number(r.time_gamificacion_s) || DEFAULT_SETTINGS.time_gamificacion_s,
    points_base: Number(r.points_base) || DEFAULT_SETTINGS.points_base,
    bonus_max: Number.isFinite(Number(r.bonus_max)) ? Number(r.bonus_max) : DEFAULT_SETTINGS.bonus_max,
  };
}

/** Lee las fichas (vinos + clasificación + nota de cata) en el ORDEN de `wineIds`. */
async function loadFichas(sb: SupabaseClient, wineIds: string[]): Promise<WineFicha[]> {
  if (wineIds.length === 0) return [];

  const { data: wines } = await sb
    .from("wines")
    .select("id,name,bodega,region_es,grape,vintage,bottle_price_cents,category,classification_id")
    .in("id", wineIds);
  const { data: notes } = await sb
    .from("tasting_notes")
    .select("wine_id,vista_es,nariz_es,boca_es,curiosidad_es")
    .in("wine_id", wineIds);

  const classIds = (wines ?? []).map((w) => w.classification_id).filter(Boolean) as string[];
  const classMap = new Map<string, string>();
  if (classIds.length > 0) {
    const { data: classes } = await sb
      .from("wine_classifications")
      .select("id,label_es")
      .in("id", classIds);
    for (const c of classes ?? []) classMap.set(c.id as string, c.label_es as string);
  }

  const winesById = new Map((wines ?? []).map((w) => [w.id as string, w]));
  const notesById = new Map((notes ?? []).map((n) => [n.wine_id as string, n]));

  const fichas: WineFicha[] = [];
  wineIds.forEach((id, i) => {
    const w = winesById.get(id);
    if (!w) return; // vino borrado entre la resolución y la lectura: se omite (hueco)
    const n = notesById.get(id);
    fichas.push({
      id,
      wineIndex: i,
      name: (w.name as string) ?? "",
      bodega: (w.bodega as string) ?? null,
      region: (w.region_es as string) ?? null,
      grape: (w.grape as string) ?? null,
      vintage: (w.vintage as number) ?? null,
      priceBucket: priceBucket((w.bottle_price_cents as number) ?? null),
      category: (w.category as string) ?? null,
      classificationLabel: w.classification_id ? classMap.get(w.classification_id as string) ?? null : null,
      curiosidad: (n?.curiosidad_es as string) ?? null,
      tasting: {
        vista: (n?.vista_es as string) ?? null,
        olfato: (n?.nariz_es as string) ?? null,
        gusto: (n?.boca_es as string) ?? null,
      },
    });
  });
  // Reindexa por si algún vino se omitió (mantiene wineIndex 0..n-1 contiguo).
  fichas.forEach((f, i) => (f.wineIndex = i));
  return fichas;
}

/** Banco de preguntas `game_questions` (activas) de estos vinos, agrupado por (wine_id, fase). */
async function loadBank(
  sb: SupabaseClient,
  wineIds: string[],
): Promise<Map<string, { text_es: string; options: unknown; correct_answer: string | null }>> {
  const byKey = new Map<string, { text_es: string; options: unknown; correct_answer: string | null }>();
  if (wineIds.length === 0) return byKey;
  const { data: rows } = await sb
    .from("game_questions")
    .select("wine_id,fase,text_es,options,correct_answer,created_at,id")
    .in("wine_id", wineIds)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  for (const r of rows ?? []) {
    const key = `${r.wine_id}|${r.fase}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        text_es: r.text_es as string,
        options: r.options,
        correct_answer: (r.correct_answer as string) ?? null,
      });
    }
  }
  return byKey;
}

function asStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  if (v.some((x) => typeof x !== "string")) return null;
  return v as string[];
}

/**
 * Construye el juego completo para un `code`: settings + fichas + las ~16 preguntas (con la
 * respuesta, uso interno). Por cada (vino, fase): usa el BANCO si la fila es válida
 * (`correct_answer` ∈ `options`), si no DERIVA de la ficha+taxonomía. Si no hay vinos o
 * ninguna pregunta es derivable, `questions` queda vacío → el cliente cae a modo demo.
 */
export async function loadGame(sb: SupabaseClient, code: string): Promise<Game> {
  const { wineIds, packTier } = await resolveWines(sb, code);
  const [settings, fichas, bank] = await Promise.all([
    loadSettings(sb, packTier),
    loadFichas(sb, wineIds),
    loadBank(sb, wineIds),
  ]);

  // Hermanos de clasificación (mismo tipo) desde el catálogo, orden determinista por slug.
  const { data: catalog } = await sb
    .from("wine_classifications")
    .select("category,slug,label_es")
    .eq("active", true)
    .order("slug", { ascending: true });
  const classifSiblings = (category: string, exclude: string): string[] =>
    (catalog ?? [])
      .filter((c) => c.category === category && c.label_es !== exclude)
      .map((c) => c.label_es as string);

  const questions: ServerQuestion[] = [];
  for (const ficha of fichas) {
    for (const fase of FASES) {
      const banked = bank.get(`${ficha.id}|${fase}`);
      const opts = banked ? asStringArray(banked.options) : null;
      if (banked && opts && opts.length > 0 && banked.correct_answer) {
        const correctIndex = opts.indexOf(banked.correct_answer);
        if (correctIndex >= 0) {
          // Banco válido: se sirve TAL CUAL (sin barajar; orden estable = mismo en close).
          questions.push({
            wineIndex: ficha.wineIndex,
            fase,
            prompt: banked.text_es,
            options: opts,
            correctIndex,
            correctLabel: banked.correct_answer,
          });
          continue;
        }
      }
      // Sin banco válido → derivar de la ficha + taxonomía (FR-12).
      const derived = deriveQuestion(fichas, ficha.wineIndex, fase, classifSiblings);
      if (derived) questions.push(derived);
    }
  }

  return { settings, fichas, questions };
}

/** Ficha completa que viaja en el `reveal` de la última fase del vino (para el podio del vino). */
export function revealedWineOf(ficha: WineFicha | undefined) {
  if (!ficha) return undefined;
  return {
    name: ficha.name,
    bodega: ficha.bodega,
    grape: ficha.grape,
    region: ficha.region,
    vintage: ficha.vintage,
    price: ficha.priceBucket,
    classification: ficha.classificationLabel,
    curiosidad: ficha.curiosidad,
  };
}

/** Normaliza `answers` a un mapa `{ playerId: { optionIndex, seq } }` (acepta map u array). */
export function normalizeAnswers(
  answers: unknown,
): Record<string, { optionIndex: number; seq: number }> {
  const out: Record<string, { optionIndex: number; seq: number }> = {};
  if (!answers || typeof answers !== "object") return out;
  if (Array.isArray(answers)) {
    for (const a of answers) {
      if (a && typeof a === "object") {
        const rec = a as Record<string, unknown>;
        if (typeof rec.playerId === "string") {
          out[rec.playerId] = { optionIndex: Number(rec.optionIndex), seq: Number(rec.seq) };
        }
      }
    }
    return out;
  }
  for (const [pid, a] of Object.entries(answers as Record<string, unknown>)) {
    if (a && typeof a === "object") {
      const rec = a as Record<string, unknown>;
      out[pid] = { optionIndex: Number(rec.optionIndex), seq: Number(rec.seq) };
    }
  }
  return out;
}

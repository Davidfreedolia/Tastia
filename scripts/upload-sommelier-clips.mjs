// Sube los clips del sommelier (Beronia_*.mp4) al bucket público `videos` de Supabase Storage.
// Los consume la vista /tv/$code (ver src/lib/clip-map.ts). El host castea /tv a la TV.
//
// Requisitos: Node 18+ (fetch global). El bucket `videos` debe existir antes
//   (migración supabase/migrations/20260625130000_videos_bucket.sql).
//
// Uso (PowerShell, en la raíz del repo):
//   $env:SUPABASE_URL="https://tyuehzsqvjpjysxdihsh.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY="<service_role de Supabase → Settings → API>"
//   node scripts/upload-sommelier-clips.mjs "C:\ruta\a\los\clips"
//
// El service_role bypasea RLS: no importa la policy, sube igual. NUNCA lo commitees.

import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const DIR = process.argv[2] || "./clips";
const BUCKET = "videos";

// Los 11 clips que espera src/lib/clip-map.ts (el 09 está aparcado a propósito).
const EXPECTED = [
  "Beronia_00_Bienvenida_Tasti.mp4",
  "Beronia_01_vista_explicacion.mp4",
  "Beronia_02_vista_reveal_introNariz.mp4",
  "Beronia_03_nariz_explicacion.mp4",
  "Beronia_04_nariz_reveal_introBoca.mp4",
  "Beronia_05_boca_explicacion.mp4",
  "Beronia_06_boca_reveal_introUva.mp4",
  "Beronia_07_uva_explicacion.mp4",
  "Beronia_08_uva_reveal_introClasif.mp4",
  "Beronia_10_vino_reveal_ficha.mp4",
  "Beronia_11_cierre.mp4",
];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("✗ Falta SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}

let files;
try {
  files = (await readdir(DIR)).filter((f) => extname(f).toLowerCase() === ".mp4");
} catch {
  console.error(`✗ No pude leer la carpeta "${DIR}". Pasa la ruta de los .mp4 como argumento.`);
  process.exit(1);
}
if (files.length === 0) {
  console.error(`✗ No hay ficheros .mp4 en "${DIR}".`);
  process.exit(1);
}

console.log(`Subiendo ${files.length} clip(s) al bucket "${BUCKET}" de ${SUPABASE_URL}\n`);

let ok = 0;
let fail = 0;
for (const f of files) {
  const bytes = await readFile(join(DIR, f));
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(f)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "video/mp4",
      "cache-control": "3600",
      "x-upsert": "true",
    },
    body: bytes,
  });
  if (res.ok) {
    ok++;
    console.log(`  ✓ ${f}  (${(bytes.length / 1048576).toFixed(1)} MB)`);
  } else {
    fail++;
    const body = await res.text().catch(() => "");
    console.error(`  ✗ ${f} → ${res.status} ${body}`);
    if (res.status === 400 && /bucket/i.test(body)) {
      console.error('    → El bucket "videos" no existe. Aplica primero la migración 20260625130000_videos_bucket.sql.');
    }
  }
}

const present = new Set(files);
const missing = EXPECTED.filter((e) => !present.has(e));
console.log(`\nSubidos: ${ok}  ·  Fallos: ${fail}`);
if (missing.length) {
  console.warn(`⚠ Faltan por subir (los espera clip-map.ts): ${missing.join(", ")}`);
} else if (fail === 0) {
  console.log("✓ Están los 11 clips que espera la app.");
}
console.log(`\nComprueba uno: ${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/Beronia_00_Bienvenida_Tasti.mp4`);
console.log("Y en vivo: https://tastia.org/tv/TEST");

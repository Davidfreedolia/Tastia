// §5.11 — Reducción de la foto del participante EN CLIENTE antes de entrar en presence.
// La foto viaja como data-URL en la metadata de presence (no Storage, no BD): debe ser
// ligera (~5–10KB), así que se reduce a ~128px de lado máximo y JPEG calidad ~0.7.

/** Lado máximo (px) de la foto reducida. Mantiene el payload de presence pequeño. */
export const PHOTO_MAX_DIM = 128;
/** Calidad JPEG de la foto reducida (0..1). */
export const PHOTO_QUALITY = 0.7;
/** Tamaño máximo del archivo de entrada (25MB): evita leer una foto de cámara
 *  de 20–50MB entera a base64 (pico de memoria). Por encima → se entra sin foto. */
export const MAX_INPUT_BYTES = 25 * 1024 * 1024;
/** Tope del data-URL de salida (~22KB en bytes). Por encima → null en vez de meter
 *  un payload desmesurado en presence. */
export const MAX_OUTPUT_CHARS = 30_000;
/** Tiempo máximo (ms) para que la imagen decodifique; si no, se resuelve a null. */
export const DECODE_TIMEOUT_MS = 5000;

/**
 * Reduce un archivo de imagen a un data-URL JPEG de ~128px de lado máximo (calidad ~0.7).
 * Devuelve `null` si el archivo no es una imagen legible o si la conversión falla, para
 * que el flujo de unión pueda continuar SIN foto (cae al avatar de iniciales). Pura del
 * lado del navegador: usa `<canvas>` y un `<img>` (no toca red ni Storage).
 */
export async function downscaleImage(
  file: File,
  maxDim: number = PHOTO_MAX_DIM,
  quality: number = PHOTO_QUALITY,
): Promise<string | null> {
  if (!file.type.startsWith("image/")) return null;
  // Demasiado grande: saltar (se entra sin foto) para no leerla entera a base64.
  if (file.size > MAX_INPUT_BYTES) return null;

  const dataUrl = await readAsDataUrl(file).catch(() => null);
  if (!dataUrl) return null;

  // `loadImage` se resuelve a null si decodifica con error o si se agota el timeout.
  const img = await loadImage(dataUrl);
  if (!img || !img.width || !img.height) return null;

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  try {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const out = canvas.toDataURL("image/jpeg", quality);
    // `toDataURL` puede devolver "data:," si el canvas está vacío/contaminado.
    if (!out.startsWith("data:image/jpeg")) return null;
    // Tope de salida: si el data-URL es demasiado grande, se entra sin foto.
    if (out.length > MAX_OUTPUT_CHARS) return null;
    return out;
  } catch {
    return null;
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/**
 * Decodifica un data-URL a `<img>`. Resuelve a `null` (en vez de quedarse colgada para
 * siempre) si `onload`/`onerror` nunca disparan con un data-URL corrupto: un timeout de
 * `DECODE_TIMEOUT_MS` la rescata. El temporizador se limpia al cargar o fallar.
 */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(null), DECODE_TIMEOUT_MS);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

// §Activar — Normalización PURA del access_code (sin I/O, testeable).
//
// Canonicaliza lo que el comprador teclea o lo que llega por `?code=` antes de
// compararlo contra `orders`: recorta espacios externos, pasa a mayúsculas y
// colapsa cualquier espacio interno. Idempotente: `f(f(x)) === f(x)`.
export function normalizeAccessCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

---
title: '§5.8c — Clasificación de vinos (admin): editar wines.category + classification_id en /admin'
type: 'feature'
created: '2026-06-21'
status: 'done'
baseline_commit: 'a517def'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La sección "Vinos" de `/admin` es un Placeholder. No se puede corregir a mano el **tipo**
(`wines.category`) ni la **clasificación** (`wines.classification_id` → `wine_classifications`) de cada
vino; hoy solo lo rellena el importador CSV (#8).

**Approach:** Rellenar la sección **"Vinos"** de `/admin` con un editor que liste los vinos y permita
asignar `category` (enum `wine_category`) y `classification_id` (de `wine_classifications`, filtrado por la
categoría elegida), en el MISMO patrón que §5.8a/§5.8b (cliente autenticado + RLS, `.select("id")` para
detectar escritura denegada). Edición/corrección manual; el importador sigue rellenándolos al importar.

## Product Decisions

- **Dónde:** la sección existente "Vinos" de `/admin` (hoy `Placeholder`) → renderiza un componente nuevo.
- **Escritura = cliente autenticado** sobre `wines` (UPDATE por id de `category` + `classification_id`), `.select("id")` → 0 filas = "sin permiso de administrador" (honesto). **NO** service key.
- **Coherencia tipo↔clasificación:** el select de clasificación muestra SOLO las `wine_classifications` de la `category` elegida (y solo `active`); `classification_id` guardado DEBE pertenecer a esa categoría. Cambiar la categoría limpia una clasificación de otra categoría.
- **`classification_id` opcional:** se puede dejar "sin clasificar" (`null`).
- **Solo `category` + `classification_id`:** no se editan aquí nombre/precio/etc. (eso es otro CRUD).
- Filtrado/validación = función **pura testeable**; la I/O (load/update) vive en el componente.

## Boundaries & Constraints

**Always:** escribir vía cliente autenticado + RLS con `.select()` (0 filas → mensaje honesto, sin falso
"Guardado"); la clasificación guardada pertenece a la categoría del vino; el select solo ofrece
clasificaciones `active` de esa categoría; `/admin` sigue tras `RequireAuth`; sin Supabase → aviso honesto.

**Ask First / coordinación:** `wines` necesita policy RLS de escritura para admins (como `game_settings`);
si las escrituras dan 0 filas, coordinar con **Salvador**.

**Never:** tocar el motor del juego, edge functions, avatar, migraciones, ni el **esquema** de `wines`/
`wine_classifications` (usar columnas existentes); editar otros campos del vino aquí; usar service key.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Asignar tipo + clasificación | vino + `category` + `classification_id` de esa categoría | UPDATE `wines`; la lista refleja el cambio | error BD → mensaje |
| Cambiar de categoría | categoría nueva con clasificación de otra | el select de clasificación se refiltra; la previa (de otra cat.) se limpia a null | — |
| Sin clasificar | `classification_id` vacío | guarda `classification_id = null` | — |
| RLS sin permiso | UPDATE devuelve 0 filas | "No se guardó (¿sin permiso de administrador?)" | sin falso "Guardado" |
| Supabase no configurado | `getSupabase()` null | aviso honesto; no peta | — |
| Sin vinos / sin clasificaciones | tablas vacías | estado vacío claro | — |

</frozen-after-approval>

## Code Map

- `src/routes/admin.tsx` -- en el render, sustituir el `Placeholder` de la sección **"wines"** por `<WineClassification/>` (import nuevo); ajustar la condición del `Placeholder` para no capturar "wines".
- `src/components/wine-classification.tsx` -- **NUEVO**: carga `wines` (`id,name,category,classification_id`) y `wine_classifications` (`id,category,label_es,slug,active`); por vino: select de `category` + select de clasificación (filtrado por categoría, solo `active`); guardar vía `getSupabase()` UPDATE + `.select("id")`.
- `src/lib/wine-classification.ts` -- **NUEVO, PURO**: `WINE_CATEGORIES` (de `wine_category`), `classificationsFor(list, category)` (filtra por categoría + `active`), `isPairingValid(classifications, category, classification_id)` (null válido; si no, debe pertenecer a la categoría).
- `src/lib/wine-classification.test.ts` -- **NUEVO**: tests del filtrado + validación de coherencia.
- `src/lib/database.types.ts` -- `wines` (`category`/`classification_id`), `wine_classifications`, enum `wine_category` (`tinto|blanco|rosado|espumoso|cava`) (contexto).

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/wine-classification.ts` (NUEVO, PURO) -- `WINE_CATEGORIES = ["tinto","blanco","rosado","espumoso","cava"] as const`; tipos. `classificationsFor(classifications, category)` → solo las `active` de esa `category`. `isPairingValid(classifications, category, classification_id)` → `true` si `classification_id` es `null`/"" o si existe una clasificación con ese id Y `category` igual. Sin I/O.
- [x] `src/lib/wine-classification.test.ts` (NUEVO) -- filtra por categoría + active; pairing válido (null OK; id de la categoría OK; id de otra categoría → false; id inexistente → false).
- [x] `src/components/wine-classification.tsx` (NUEVO) -- `WineClassification`: carga `wines` + `wine_classifications`; tabla con nombre, select de `category`, select de clasificación (opciones = `classificationsFor(cls, category)` + opción "Sin clasificar"); al cambiar `category`, si la `classification_id` actual no pertenece, ponerla a `null`; botón Guardar por fila → `sb.from("wines").update({ category, classification_id }).eq("id", id).select("id")`; 0 filas → "sin permiso"; recarga. Sin Supabase → aviso. Estética como `admin.tsx`.
- [x] `src/routes/admin.tsx` -- render de la sección "wines" → `<WineClassification/>`; quitar "wines" del `Placeholder`.

**Acceptance Criteria:**
- Given un vino, una `category` y una `classification_id` de esa categoría, when guardo, then `wines.category` y `classification_id` se actualizan y la lista lo refleja.
- Given que cambio la categoría a una donde la clasificación previa no aplica, when re-renderiza, then el select de clasificación solo ofrece las de la categoría nueva y la previa se limpia (no se guarda una pareja incoherente).
- Given `classification_id` vacío, when guardo, then se guarda `null` ("sin clasificar").
- Given que el UPDATE devuelve 0 filas (RLS sin permiso), when guardo, then "No se guardó (¿sin permiso de administrador?)" y no un falso éxito.
- Given Supabase no configurado, when entro, then aviso honesto sin romper.

## Spec Change Log

- 2026-06-21 — Creada y aprobada por delegación de David ("tú decides, sin tiempo"). Editor de
  `wines.category` + `classification_id` en la sección "Vinos" de `/admin` (patrón §5.8a/§5.8b: cliente +
  RLS + `.select()`). Coherencia tipo↔clasificación (clasificación de la categoría del vino). RLS de
  escritura de `wines` para admins = coordinación con Salvador si dan 0 filas.

- 2026-06-21 — Implementado + verificación del orquestador (lib pura revisada; 3.º CRUD con el patrón ya
  auditado en §5.8b, riesgo bajo → sin revisor adversarial completo por tiempo). La invariante
  tipo↔clasificación la garantizan `classificationsFor` (el select solo ofrece la categoría) + `isPairingValid`
  (defensa antes de escribir). Escritura honesta con `.select("id")` (sin service key). 147 tests verdes.

## Suggested Review Order

**Lógica pura (coherencia)**

- `classificationsFor` (solo activas de la categoría) + `isPairingValid` (no guardar clasificación de otra categoría).
  [`wine-classification.ts:29`](../../src/lib/wine-classification.ts#L29)
- Tests.
  [`wine-classification.test.ts:1`](../../src/lib/wine-classification.test.ts#L1)

**UI (patrón §5.8a/b)**

- `WineClassification` — guardado por fila con `.select("id")` (0 filas → "sin permiso").
  [`wine-classification.tsx:1`](../../src/components/wine-classification.tsx#L1)
- Sección "Vinos" en `/admin`.
  [`admin.tsx`](../../src/routes/admin.tsx)

## Design Notes

- **Coherencia:** el select de clasificación se deriva de la categoría elegida; así nunca se guarda una
  clasificación de otra categoría. `isPairingValid` lo asegura también en código (defensa).
- **Importador vs admin:** el CSV (#8) ya rellena ambos al importar; esto es edición/corrección manual.
- **Sin service key:** modelo RLS de admin (§5.8a). Si falta la policy de `wines`, el `.select()` lo delata.

## Verification

**Commands:**
- `bunx tsc --noEmit` -- sin errores.
- `bunx vitest run` -- pasan `wine-classification` + los existentes.
- `bun run build` -- OK.

**Manual checks:**
- En `/admin` → "Vinos": cambiar el tipo y la clasificación de un vino; ver que el select de clasificación
  se filtra por tipo; guardar; comprobar en Supabase que `category`/`classification_id` cuadran (misma categoría).

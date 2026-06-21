---
title: '§5.8b — Admin del banco de preguntas: CRUD de game_questions en /admin'
type: 'feature'
created: '2026-06-21'
status: 'in-progress'
baseline_commit: 'TBD'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El operador no puede gestionar las **preguntas del juego**: hoy `game_questions` solo se edita
desde Supabase Studio. §5.8a ya trajo los ajustes (`game_settings`) y el panel de readiness a `/admin`,
pero falta el CRUD del banco de preguntas.

**Approach:** Una sección **"Preguntas"** en `/admin` para crear/editar/activar/borrar `game_questions` por
**vino y fase**, en el MISMO patrón que §5.8a/Proveedores (cliente autenticado + RLS, `.select()` para
detectar escritura denegada). El formato que se guarda respeta el contrato que ya consume el juego
(`quiz-source.ts`): **`options` = array de strings** y **`correct_answer` = exactamente una de esas
opciones** (el índice lo resuelve `quiz-close` en el backend).

## Product Decisions

- **Dónde:** nueva sección "Preguntas" en `/admin` (extiende `SECTIONS`); UI en un componente nuevo para no inflar `admin.tsx`.
- **Escritura = cliente autenticado** (`getSupabase()`) sobre `game_questions`, confiando en RLS; tras escribir, `.select("id")` para detectar 0 filas (RLS sin permiso) → error honesto, igual que §5.8a. **NO** service key.
- **Formato (contrato con el juego):** `options` se guarda como **JSON `string[]`**; `correct_answer` = el **string exacto** de la opción correcta (debe estar entre `options`). Así `quiz-bootstrap` sirve `{prompt, options}` y `quiz-close` resuelve `correctOptionIndex` buscando `correct_answer` en `options`.
- **Campos:** `wine_id` (select de `wines`), `fase` (enum), `type` (enum, opcional), `text_es` (obligatorio), `text_en` (opcional), `options` (lista dinámica ≥2), `correct_answer` (se elige entre las opciones), `points` (>0), `active` (def. true).
- **Lista** filtrable por vino; cada fila: enunciado, fase, tipo, puntos, activo; acciones editar / activar-desactivar / borrar.
- Validación = función **pura testeable**; la I/O (load/insert/update/delete) vive en el componente.

## Boundaries & Constraints

**Always:** escribir vía cliente autenticado + RLS y comprobar con `.select()` (0 filas → "sin permiso de
administrador"); `options` como JSON `string[]`; `correct_answer` SIEMPRE igual a una de las `options`;
`/admin` sigue tras `RequireAuth`; mensajes honestos (sin Supabase → aviso, no finge).

**Ask First / coordinación:** `game_questions` necesita política RLS de escritura para admins (como
`game_settings`); si las escrituras dan 0 filas, coordinar con **Salvador** para añadir la policy.

**Never:** tocar el motor del juego (`session.ts`/`use-room-channel.ts`/`quiz-source.ts`), edge functions,
avatar, migraciones, ni el **esquema** de `game_questions` (usar columnas existentes); cambiar el contrato
`options`/`correct_answer`; usar service key para saltar RLS.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Crear pregunta válida | vino+fase+enunciado+≥2 opciones+1 correcta+puntos | inserta en `game_questions` (`options` string[], `correct_answer`∈options); aparece en la lista | error BD → mensaje |
| Editar | cambios en una fila | UPDATE por id; refresca la lista | 0 filas → "sin permiso" |
| Activar/desactivar · Borrar | toggle `active` / delete | refleja el cambio | 0 filas → "sin permiso" |
| Validación | sin enunciado / <2 opciones / sin correcta / correcta ∉ opciones / puntos ≤0 | bloquea con mensaje, no escribe | — |
| RLS sin permiso | escritura devuelve 0 filas | "No se guardó (¿sin permiso de administrador?)" | sin falso "Guardado" |
| Supabase no configurado | `getSupabase()` null | aviso honesto; no peta | — |

</frozen-after-approval>

## Code Map

- `src/routes/admin.tsx` -- añadir `{ id: "questions", label: "Preguntas" }` a `SECTIONS` y renderizar `<QuestionBank/>` (import del componente nuevo). Patrón a imitar: `Suppliers`/`GameSettings` (load + `.select()`).
- `src/components/question-bank.tsx` -- **NUEVO**: UI CRUD. Carga `wines` (id+nombre) y `game_questions`; formulario (alta/edición) con lista dinámica de opciones y selección de la correcta; lista filtrable; save/update/delete/toggle vía `getSupabase()` con `.select("id")`.
- `src/lib/game-questions.ts` -- **NUEVO, PURO**: `QUESTION_FASES`/`QUESTION_TYPES` (de los enums), `validateQuestionForm(form)` y `questionInsertFromForm(form)` → `game_questions` Insert (`options` como `string[]`).
- `src/lib/game-questions.test.ts` -- **NUEVO**: tests de validación + mapeo.
- `src/lib/database.types.ts` -- `game_questions` (Row/Insert) + enums `question_fase`/`question_type` (contexto).
- `src/lib/quiz-source.ts` -- contrato consumidor (`questionFor` → `{prompt, options}`; `correct_answer` lo resuelve `quiz-close`) (contexto, NO tocar).

## Tasks & Acceptance

**Execution:**
- [ ] `src/lib/game-questions.ts` (NUEVO, PURO) -- `QUESTION_FASES = ["vista","olfato","gusto","gamificacion"]`, `QUESTION_TYPES = ["variedad","denominacion","precio","anada","trivia","clasificacion"]`. `QuestionForm` (wine_id, fase, type|null, text_es, text_en, options: string[], correct_answer, points, active). `validateQuestionForm(form)` → errores por campo (text_es no vacío; opciones: ≥2 no vacías; `correct_answer` ∈ opciones no vacías; points entero >0). `questionInsertFromForm(form)` → `game_questions` Insert (`options` como `string[]` (Json), recorta opciones vacías, `text_en` "" → null, `type` "" → null).
- [ ] `src/lib/game-questions.test.ts` (NUEVO) -- tests: válido OK; <2 opciones falla; correcta no ∈ opciones falla; puntos ≤0 falla; `questionInsertFromForm` mapea options/correct_answer/null bien.
- [ ] `src/components/question-bank.tsx` (NUEVO) -- componente `QuestionBank`: `useEffect` carga `wines` (`id,name`) y `game_questions`; estado de formulario (nuevo/edición); inputs (select vino, select fase, select tipo, texto ES/EN, lista de opciones con añadir/quitar, radio "correcta", puntos, checkbox activo); botón Guardar (insert/update con `.select("id")`; 0 filas → "sin permiso"); lista filtrable por vino con editar/activar/borrar. Usa `validateQuestionForm`/`questionInsertFromForm`. Estética como `admin.tsx` (inputs/Button existentes). Sin Supabase → aviso.
- [ ] `src/routes/admin.tsx` -- registrar la sección "Preguntas" y renderizar `<QuestionBank/>`.

**Acceptance Criteria:**
- Given un vino, una fase, un enunciado, ≥2 opciones y una marcada correcta con puntos>0, when guardo, then se inserta en `game_questions` con `options` como `string[]` y `correct_answer` igual a la opción marcada, y aparece en la lista.
- Given una fila existente, when la edito y guardo, then se actualiza (UPDATE por id) y la lista refleja el cambio.
- Given activar/desactivar o borrar, when actúo, then `active`/la fila cambian y se refresca.
- Given enunciado vacío, <2 opciones, ninguna correcta, correcta ∉ opciones, o puntos ≤0, when intento guardar, then se bloquea con un mensaje y no se escribe.
- Given que la escritura devuelve 0 filas (RLS sin permiso), when guardo, then "No se guardó (¿sin permiso de administrador?)" y no un falso "Guardado".

## Spec Change Log

- 2026-06-21 — Creada y aprobada por delegación de David ("tú decides, sin tiempo"). CRUD de `game_questions`
  en `/admin` (patrón §5.8a: cliente autenticado + RLS + `.select()`). Formato `options` string[] /
  `correct_answer`∈options, según el contrato de `quiz-source.ts`. RLS de escritura para admins =
  coordinación con Salvador si las escrituras dan 0 filas.

## Design Notes

- **Sin service key:** se mantiene el modelo de §5.8a (RLS de admin), no el del webhook. Si falta la policy
  de `game_questions`, el `.select()` lo delata con un error honesto (no un falso guardado).
- **Contrato `options`/`correct_answer`:** `quiz-bootstrap` sirve `options` y `quiz-close` busca
  `correct_answer` dentro para el índice. Por eso `correct_answer` DEBE ser idéntico a una opción.
- **`type` opcional / derivación:** `quiz-bootstrap` puede DERIVAR preguntas de la ficha+taxonomía (FR-12);
  este banco es para preguntas guardadas/override, no obligatorio para que el juego funcione.

## Verification

**Commands:**
- `bunx tsc --noEmit` -- sin errores.
- `bunx vitest run` -- pasan `game-questions` + los existentes.
- `bun run build` -- OK.

**Manual checks:**
- En `/admin` (logueado) → "Preguntas": crear una pregunta para un vino/fase con 4 opciones y una correcta;
  verla en la lista; editarla; desactivarla; borrarla. Comprobar en Supabase que `options` es un array de
  strings y `correct_answer` coincide con una opción.

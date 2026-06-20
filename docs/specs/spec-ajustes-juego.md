---
title: '§5.8a — Ajustes del juego (admin): editor de game_settings + estado del banco'
type: 'feature'
created: '2026-06-21'
status: 'ready-for-dev'
context: ['{project-root}/docs/edge-functions-contract.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La lógica de juego (tiempos por fase, puntos base, bonus) vive hardcoded en el cliente
(`session.ts`) y la tabla `game_settings` (ya en BD, de Salvador) no tiene interfaz: el equipo no puede
afinarla sin Supabase Studio. Es lógica del juego que el jugador NUNCA debe tocar (FR-15).

**Approach:** Rellenar la sección "Gamificación" de `/admin` (patrón del CRUD de Proveedores) con un
editor de `game_settings` —fila **global** + por **pack** (basico/normal/premium)— y un panel read-only
del estado del banco (`wines_question_readiness`). NO cambia el runtime del juego: solo deja los valores
preparados; los consumirá la edge function `quiz-bootstrap` en §5.6b (Salvador).

## Product Decisions

- Editar fila **global** (`pack_tier` null) **+ por pack** (basico/normal/premium) -- el equipo quiere afinar por gama.
- `ranking_period` **fuera** del editor -- es config del ranking (carril de Salvador, §5.9).
- §5.8a **solo prepara datos**; el juego sigue con hardcoded hasta §5.6b -- sin regresión ni invasión del carril de Salvador.
- Incluir panel **read-only** de readiness (`wines_question_readiness`) -- visibilidad barata de qué packs/vinos están listos.
- Campos editables: `time_vista_s`, `time_olfato_s`, `time_gusto_s`, `time_gamificacion_s`, `points_base`, `bonus_max`. (`active`/`ranking_period` no se exponen.)

## Boundaries & Constraints

**Always:** escritura solo vía cliente Supabase autenticado (RLS `is_admin()`); `/admin` ya gateado por
`RequireAuth`; seguir el patrón de `Suppliers` en `admin.tsx` (form + tabla, `getSupabase`, manejo de
error); **global**: UPDATE de la única fila global (Salvador la fuerza única con índice único parcial);
**por pack**: `upsert` sobre `pack_tier` (único); validar rangos antes de escribir.

**Ask First:** cualquier necesidad de cambiar el esquema de `game_settings` (es de Salvador) -- HALT y
coordinar; exponer `active` o `ranking_period` -- fuera de alcance, preguntar antes de añadir.

**Never:** tocar migraciones, edge functions, el ranking de la landing ni el runtime del juego
(`session.ts`/`use-room-channel.ts`); hacer que el juego LEA `game_settings` (eso es §5.6b, Salvador);
CRUD de `game_questions` (§5.8b) ni clasificación de vinos (§5.8c), ambos diferidos.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Abrir editor | hay fila global + filas por tier | 4 bloques (Global/Básico/Normal/Premium) precargados con valores actuales | si falta la fila de un tier: bloque con defaults de la global, marcado "sin guardar" |
| Guardar válido (fila existente) | times 5–300, points_base 0–1000, bonus_max 0–1000 | global: UPDATE; pack: `upsert` por `pack_tier`; confirma "Guardado" y refresca | error RLS/red → mensaje visible, sin cambios locales |
| Guardar pack sin fila previa | `pack_tier` p.ej. basico, valores válidos | `upsert` crea la fila por `pack_tier` | error → mensaje |
| Valor fuera de rango / no entero | p.ej. time 0, negativo, vacío | botón Guardar deshabilitado; no envía | validación en cliente (sin tocar BD) |
| Panel readiness | vista `wines_question_readiness` | tabla read-only: vino, `fases_cubiertas`/4, ✓/✗ `ready` | vacío → "Sin vinos todavía" |

</frozen-after-approval>

## Code Map

- `src/routes/admin.tsx` -- panel `/admin`; `SECTIONS` ya incluye `gamification` (hoy `Placeholder`); patrón `Suppliers` (form+tabla, `getSupabase`, error state) a replicar.
- `src/lib/database.types.ts` -- tipos `game_settings` (Row/Insert/Update), vista `wines_question_readiness`, enum `price_band` = basico|normal|premium.
- `src/lib/supabase.ts` -- `getSupabase()` (cliente Supabase del navegador).
- `src/lib/session.ts` -- `FASE_SECONDS` (30/30/45/30), `BASE` 100, `BONUS_MAX` 50 -- valores de referencia para defaults; NO se modifica.
- `src/lib/require-auth.tsx` -- `RequireAuth`, ya envuelve `/admin`.

## Tasks & Acceptance

**Execution:**
- [ ] `src/lib/game-settings.ts` -- definir `SETTINGS_LIMITS` (rangos), tipo `SettingsForm`, función pura `validateGameSettings(form): Record<field,string>` (errores por campo) y `defaultsFromGlobal(globalRow)`; reexportar las 4 gamas (`null`,basico,normal,premium) con etiqueta amigable (Global/Básico/Normal/Premium). Sin I/O.
- [ ] `src/lib/game-settings.test.ts` -- unit tests de `validateGameSettings`: válidos, límites, 0/negativo/no-entero/vacío, y `defaultsFromGlobal`.
- [ ] `src/routes/admin.tsx` -- reemplazar el `Placeholder` de `gamification` por `GameSettings`: cargar todas las filas de `game_settings`, render de 4 bloques editables (campos time_*_s, points_base, bonus_max) usando `validateGameSettings`; guardar por bloque (global: UPDATE de la fila global; pack: `upsert` sobre `pack_tier`); estado guardando/guardado/error. Reusar estilos del patrón Suppliers.
- [ ] `src/routes/admin.tsx` -- añadir bajo el editor un panel read-only `Readiness`: cargar `wines_question_readiness` y tabla (vino, `fases_cubiertas`/4, ✓/✗).

**Acceptance Criteria:**
- Given un admin en `/admin` → "Gamificación", when abre, then ve 4 bloques (Global/Básico/Normal/Premium) precargados desde `game_settings` y un panel read-only de readiness.
- Given valores válidos, when guarda un bloque, then la fila de `game_settings` se actualiza (o se crea con su `pack_tier`) y, al recargar, persiste.
- Given un valor fuera de rango, when intenta guardar, then se bloquea con mensaje y no se escribe en BD.
- Given un usuario sin permiso (RLS `is_admin` false), when guarda, then ve un error y la BD no cambia.
- Given el juego en vivo, when se editan los settings, then su comportamiento NO cambia (sigue con hardcoded) — sin regresión.

## Spec Change Log

- 2026-06-21 — Aprobada (ready-for-dev). Notas de Salvador incorporadas: global = UPDATE (fila única
  forzada con índice único parcial), pack = `upsert` sobre `pack_tier`; `wines_question_readiness` la
  redefine él para medir derivabilidad (mismas columnas, el panel no cambia); el admin debe estar en la
  tabla `admins`.

## Design Notes

- **Persistencia (confirmado con Salvador):** la fila **global** es única (la fuerza con un índice único
  parcial) → **UPDATE** de esa fila; las filas **por pack** → **`upsert` sobre `pack_tier`** (único).
- **Vista `wines_question_readiness`:** Salvador la **redefine** para medir **derivabilidad** (notas +
  ficha del vino), no el recuento de `game_questions` (vacía, porque las preguntas se derivan) — **mismas
  columnas**, así que el panel no cambia, solo dice la verdad. Lo hace él.
- **RLS:** el admin debe estar en la tabla `admins` para que la política le deje escribir
  (`hola@tastia.org` ya está).
- `price_band` (basico/normal/premium) ≠ nombres comerciales de la landing (Winelover/Enology/Deluxe):
  en la UI se muestran etiquetas neutras (Global/Básico/Normal/Premium) para no acoplar a la landing.

## Verification

**Commands:**
- `bunx tsc --noEmit` -- expected: sin errores.
- `bunx vitest run` -- expected: pasan los tests de `game-settings` + los existentes (≥43).
- `bun run build` -- expected: build OK.

**Manual checks:**
- En el preview, `/admin` → "Gamificación": editar tiempos/puntos de un bloque, Guardar, recargar → persiste; el panel readiness lista los vinos con `fases_cubiertas`/4 y ✓/✗.

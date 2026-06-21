---
title: '§Activar — Ruta /activar: canje del access_code → entrar a la sala como host'
type: 'feature'
created: '2026-06-21'
status: 'done'
baseline_commit: 'bdf1837'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** §B2 envía al comprador un QR/enlace `…/activar?code=ACCESS_CODE`, pero la ruta `/activar`
**no existe**: el comprador no puede canjear su código ni empezar la cata. El bucle comercio→juego está
abierto.

**Approach:** Una ruta **pública** `/activar` que lee `?code=` (o deja teclearlo), **valida el
`access_code`** contra `orders` (server-fn de Vercel con la service key, sin depender de Salvador) y, si
es de un pedido **pagado**, deja al comprador **empezar la cata como host** navegando a `/room/<code>`.

## Product Decisions

- **Validación = `createServerFn` en Vercel** con `SUPABASE_SERVICE_ROLE_KEY` (mismo patrón que `checkout.server.ts`/§B1): lee `orders` saltando RLS. **No** es una edge function de Salvador.
- **Válido = existe una fila en `orders` con ese `access_code` y `status='pagado'`.** Cualquier otro estado (pendiente/cancelado/…) o code inexistente → inválido.
- **`roomCode` = el propio `access_code`** (único; el host lo comparte con invitados vía `/play/<access_code>`). Endurecimiento futuro: un código de sala fresco distinto del credencial.
- **Fallback honesto:** sin service key → estado "activación no disponible aún" (no finge validez).
- **`/activar` es PÚBLICA** (sin `RequireAuth`, como `/room`//`/play`): el comprador es anónimo.
- **Sin caducidad:** `orders` no tiene `activation_expires_at` → no se comprueba (diferido; necesita migración).
- **Reactivación idempotente:** el mismo code reabre `/room/<code>` (la sala es efímera; no se "consume").
- Normalización del code (trim + mayúsculas) = función **pura testeable**; el read de `orders` = I/O en el server-fn.

## Boundaries & Constraints

**Always:** validar **server-side** con la service key (nunca confiar en validación de cliente);
`SUPABASE_SERVICE_ROLE_KEY` solo server-side (`process.env`, nunca cliente); solo `status='pagado'` es
válido; mensajes honestos en cada estado; `/activar` pública; normalizar el code antes de comparar.

**Ask First (setup de David):** `SUPABASE_SERVICE_ROLE_KEY` en el env de Vercel (ya necesaria para §B1).

**Never:** tocar el motor de sala (`room/$code`, `play/$code`, `use-room-channel`) salvo **navegar** a
`/room/<code>`; edge functions de Salvador, avatar, migraciones ni el esquema de `orders`; añadir
caducidad (no hay columna); exponer la service key al cliente; revelar detalles internos en los errores.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Code de pedido pagado | `?code=` o tecleado; `status='pagado'` | estado "válido" + botón "Empezar la cata" → navega a `/room/<code>` | — |
| Code inexistente / no pagado | no hay fila pagada | "Código no válido o pago no encontrado"; no navega | — |
| Falta `SUPABASE_SERVICE_ROLE_KEY` | service key ausente | "La activación aún no está disponible"; no finge | log server-side |
| Code con espacios / minúsculas | `" abc123 "` | se normaliza (trim+mayúsculas) y valida igual | — |
| `/activar` sin `?code=` | sin query | muestra input para teclear el code (sin error) | — |
| Error inesperado del server-fn | excepción al leer `orders` | tratado como inválido; mensaje genérico | log server-side; no filtra internals |

</frozen-after-approval>

## Code Map

- `src/routes/activar.tsx` -- **NUEVO** (ruta PÚBLICA, sin `RequireAuth`): `validateSearch` `{ code?: string }`; estados (idle/validando/válido/inválido/no-configurado); si viene `?code=` auto-valida al montar; input para teclear/reintentar; en válido → `useNavigate` a `/room/$code`.
- `src/lib/activate.server.ts` -- **NUEVO**: `validateAccessCode` (`createServerFn` POST) con la service key; lee `orders` por `access_code`+`status='pagado'`.
- `src/lib/activate.ts` -- **NUEVO, PURO**: `normalizeAccessCode(raw): string` (trim + mayúsculas + colapsa espacios internos).
- `src/lib/activate.test.ts` -- **NUEVO**: tests de `normalizeAccessCode`.
- `src/lib/checkout.server.ts` -- patrón `createServerFn` + resultado discriminado + fallback `{ configured:false }` (a imitar).
- `src/lib/database.types.ts` -- `orders` (`access_code`, `status` enum `order_status`) y el tipo `Database` para `createClient<Database>`.
- `src/routes/room/$code.tsx` -- destino (contexto: abrir `/room/<code>` convierte en host).

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/activate.ts` (NUEVO, PURO) -- `normalizeAccessCode(raw: string): string` = `raw.trim().toUpperCase().replace(/\s+/g, "")`. Sin I/O.
- [x] `src/lib/activate.test.ts` (NUEVO) -- tests: trim, mayúsculas, espacios internos eliminados, idempotente, cadena vacía → "".
- [x] `src/lib/activate.server.ts` (NUEVO) -- `validateAccessCode = createServerFn({ method: "POST" }).inputValidator(z.object({ code: z.string().min(1).max(32) })).handler(...)`: `const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL; const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;` falta → `{ configured: false }`; `const code = normalizeAccessCode(data.code)`; `createClient<Database>(url, svc)`; `.from("orders").select("status").eq("access_code", code).eq("status","pagado").maybeSingle()`; fila → `{ ok: true, roomCode: code }`; si no → `{ ok: false }`; `catch` → log + `{ ok: false }`. Resultado discriminado `{ configured:false } | { ok:true; roomCode:string } | { ok:false }`.
- [x] `src/routes/activar.tsx` (NUEVO, PÚBLICA, **sin** `RequireAuth`) -- `createFileRoute("/activar")` con `validateSearch: z.object({ code: z.string().optional() })`; componente: si hay `code` en la URL auto-llama `validateAccessCode` al montar; `Input` para teclear/reintentar; estados con copy honesto (inválido: "Código no válido o pago no encontrado"; no-config: "La activación aún no está disponible"); en `{ ok:true }` muestra "✓ Acceso válido" + botón "Empezar la cata ▸" → `useNavigate({ to: "/room/$code", params: { code: roomCode } })`. Estética sobria coherente con el resto.

**Acceptance Criteria:**
- Given un `access_code` de un pedido con `status='pagado'`, when se valida (por `?code=` o tecleado), then aparece "Acceso válido" y un botón que navega a `/room/<code>`.
- Given un code inexistente o de un pedido no `pagado`, when se valida, then se muestra "Código no válido o pago no encontrado" y no se navega.
- Given que falta `SUPABASE_SERVICE_ROLE_KEY`, when se valida, then se muestra el estado honesto "La activación aún no está disponible" (no finge validez).
- Given un code con espacios o minúsculas, when se normaliza, then valida igual que su forma canónica (trim + mayúsculas).
- Given `/activar` sin `?code=`, when se abre, then se muestra el input para teclear el código (sin error).

## Spec Change Log

- 2026-06-21 — Aprobada (ready-for-dev). `/activar` pública: valida el `access_code` (server-fn + service
  key, solo `status='pagado'`) → "Empezar la cata" como host en `/room/<code>`. `roomCode = access_code`
  (MVP). Sin caducidad (la tabla `orders` no tiene la columna). Fallback honesto sin service key.
  Diferidos: rate-limit anti-enumeración, caducidad (migración), `room_code` fresco, identidad del
  comprador. Para PROBAR: `SUPABASE_SERVICE_ROLE_KEY` en Vercel (David).

- 2026-06-21 — Implementado + revisión adversarial (2 agentes): auditor **compliant** (sin violaciones);
  security hunter **sin críticos/altos**. Sin parches: el server-fn es server-only (selecciona solo
  `status`, sin fuga de datos ni secretos), el efecto auto-valida una sola vez, la navegación es segura,
  ningún code no-pagado alcanza "válido". Notas (a `deferred-work.md` §Activar): `/activar` es un oráculo
  de existencia de pedidos pagados — mitigado porque `/room/<code>` ya es abierto (no concede capacidad
  nueva) y se cierra con el `room_code` fresco + rate-limit ya diferidos; rama `"configured" in res` (LOW,
  no es bug, sigue el patrón de `cart-sheet.tsx`).

## Suggested Review Order

**Validación (server-only)**

- `validateAccessCode` — service key, selecciona solo `status`, solo `'pagado'` es válido, fallback honesto.
  [`activate.server.ts:20`](../../src/lib/activate.server.ts#L20)
- `normalizeAccessCode` (pura) + tests.
  [`activate.ts:6`](../../src/lib/activate.ts#L6) · [`activate.test.ts:1`](../../src/lib/activate.test.ts#L1)

**Ruta pública**

- Máquina de estados + auto-validación (una vez) + navegación a `/room/$code`.
  [`activar.tsx:32`](../../src/routes/activar.tsx#L32)

## Design Notes

- **Server-fn, no edge function:** la validación corre en Vercel con la service key (igual que el webhook),
  así no bloquea con el deploy de edge functions de Salvador. Carril propio.
- **`access_code` como `roomCode`:** simple y único para el MVP; comparte el espacio del credencial con el
  código público de sala. Endurecimiento: generar un `room_code` fresco y mapearlo al pedido.
- **Anti-enumeración (diferido):** el server-fn permite probar codes; el espacio (31^8 ≈ 8,5·10¹¹) lo hace
  inviable a fuerza bruta, pero conviene **rate-limit** por IP más adelante.
- **Caducidad (diferido):** el blueprint preveía `activation_expires_at`; la tabla no lo tiene → requiere
  migración (Salvador) para caducar accesos.

## Verification

**Commands:**
- `bunx tsc --noEmit` -- sin errores.
- `bunx vitest run` -- pasan `activate` + los existentes.
- `bun run build` -- OK (la ruta `/activar` entra en el árbol de rutas).

**Manual checks (cuando David configure la service key):**
- Con `SUPABASE_SERVICE_ROLE_KEY` en Vercel y un pedido pagado real (de §B1): abrir `/activar?code=<code>`
  → "Acceso válido" → "Empezar la cata" lleva a `/room/<code>`; un code inventado → "no válido"; sin la
  service key → estado honesto "no disponible".

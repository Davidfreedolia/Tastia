# Edge functions — Cata gamificada (§5.6b)

Las **3 edge functions** que el cliente (la Sala/host y los jugadores) ya consume con
**fallback a demo**. Implementan el contrato de [`docs/edge-functions-contract.md`](../../docs/edge-functions-contract.md)
y la forma exacta que valida [`docs/integracion-bd-checklist.md`](../../docs/integracion-bd-checklist.md).

| Function | Cuándo | In → Out |
|----------|--------|----------|
| `quiz-bootstrap` | al montar la Sala | `{ code }` → `{ settings, wines[], questions[] }` (preguntas **sin** respuesta) |
| `quiz-close` | al cerrar cada pregunta | `{ code, wineIndex, fase, answers }` → `{ correctOptionIndex, correctLabel, awards, perPlayer, revealedWine? }` |
| `session-finish` | en el podio final | `{ code, host_name, pack_tier, players[] }` → `{ ok, session_id }` |

## Principios

- **Anti-spoiler:** la respuesta correcta vive SOLO aquí (service_role lee
  `game_questions.correct_answer` / la deriva). `quiz-bootstrap` **nunca** la devuelve; el
  cliente la recibe ya calculada en `quiz-close` (reveal).
- **Determinismo:** `quiz-bootstrap` y `quiz-close` producen las **mismas `options`** (mismo
  orden) para un `(code, wineIndex, fase)` — misma resolución de vinos + misma selección de
  pregunta + barajado sembrado. Así el `optionIndex` que eligió el jugador en bootstrap indexa
  la opción correcta que calcula close.
- **Dos fuentes de preguntas** (`_shared/quiz.ts`), por (vino, fase):
  1. **Banco** `game_questions` (admin) → se sirve tal cual (sin barajar).
  2. **Derivada (FR-12):** si no hay banco, se deriva de la ficha + taxonomía con el MISMO
     algoritmo que el modo demo del cliente (`src/lib/wines.ts`), para que un pack recién
     importado (vinos + notas + clasificaciones) ya juegue en modo BD sin escribir 16 preguntas.
- **Resolución de vinos para un `code`:** pedido pagado con ese `access_code` → sus
  `order_wines` por `position`; si no hay (códigos de prueba como `TEST`), 4 vinos activos en
  orden determinista. Ver `resolveWines` en `_shared/quiz.ts`.

## Estructura

```
functions/
  _shared/
    cors.ts     CORS + helpers de respuesta JSON
    client.ts   cliente Supabase service_role (SUPABASE_URL/SERVICE_ROLE_KEY del runtime)
    quiz.ts     núcleo: resolver vinos, banco+derivación determinista, scoring, reveal
  quiz-bootstrap/index.ts
  quiz-close/index.ts
  session-finish/index.ts
```

## Desplegar (quien tenga las credenciales del proyecto)

> ✅ **Ya desplegadas en prod** (23-jun, proyecto `tyuehzsqvjpjysxdihsh`): `quiz-bootstrap`/`quiz-close`/
> `session-finish` `ACTIVE`, `verify_jwt=true` (acepta la publishable key). Para re-desplegar tras un
> cambio en `_shared/`, **desde la raíz del repo** (los imports se resuelven contra el CWD):

```bash
supabase functions deploy quiz-bootstrap quiz-close session-finish --project-ref tyuehzsqvjpjysxdihsh
```

`verify_jwt = true` (en `supabase/config.toml`): aunque los clientes son anónimos (sin sesión),
`supabase-js` envía la anon key como `Authorization: Bearer` y esa anon key es un JWT válido del
proyecto, así que `verify_jwt` no bloquea al cliente legítimo y sí rechaza peticiones sin clave.
No hay secretos extra: `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta el runtime.

> **Requisito de datos para el modo BD:** que existan vinos activos con su ficha
> (`wines` + `tasting_notes` + `classification_id`). El importador CSV (`scripts/import-wines.mjs`)
> los siembra. Sin datos, `quiz-bootstrap` devuelve `questions: []` y el cliente juega en demo
> (badge "Datos demo") — comportamiento esperado, no un error.

## Probar

1. **Local:** `supabase functions serve quiz-bootstrap --no-verify-jwt` y `curl`:
   ```bash
   curl -i -X POST http://localhost:54321/functions/v1/quiz-bootstrap \
     -H 'Content-Type: application/json' -d '{"code":"TEST"}'
   ```
2. **End-to-end (preview de `dev`):** seguir el checklist de
   [`docs/integracion-bd-checklist.md`](../../docs/integracion-bd-checklist.md) → "Cuando Salvador
   despliegue": la Sala arranca sin badge "Datos demo", el reveal marca la correcta y reparte
   puntos, y el podio final crea fila en `game_sessions` + foto del ganador en el bucket `winners`.

## Verificación de tipos/lint

Son Deno (no entran en el `tsc`/`eslint` del cliente). Con Deno instalado:

```bash
deno check supabase/functions/**/index.ts
deno lint   supabase/functions
```

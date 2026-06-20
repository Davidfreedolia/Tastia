# Contrato de Edge Functions — Cata gamificada (§5.6b)

*Lo que el **cliente** (la Sala/Companion) necesita de las **edge functions** de backend, para que se
construyan a medida y los dos lados no se pisen. Propuesto desde el cliente; lo implementa quien lleva
el backend (Salvador, sobre su esquema §5.6–§5.9 ya LIVE). El cliente mantiene el Realtime
(presence/estado/respuestas); solo se mueven al backend **servir las preguntas** y **puntuar/cerrar**.*

## Principio anti-spoiler
La **respuesta correcta NUNCA llega al cliente**. Vive en la edge function (service_role: lee
`game_questions.correct_answer` / `wine_classifications`). El cliente solo recibe enunciado + opciones,
y al cerrar recibe el resultado ya calculado. Clientes **anónimos** (host y jugadores entran por QR).

## Endpoints

### 1. `quiz-bootstrap` — al iniciar la Sala
**In:** `{ code }` (código de sala/pack)
**Out:**
```jsonc
{
  "settings": { "time_vista_s":30, "time_olfato_s":30, "time_gusto_s":45, "time_gamificacion_s":30,
                "points_base":100, "bonus_max":50 },           // de game_settings (§5.8)
  "wines": [ { "wineIndex":0, "name":"…", "bodega":"…", "region":"…", "grape":"…", "vintage":2020,
               "category":"tinto", "classification":"Crianza",  // label de wine_classifications (§5.7)
               "tasting": { "vista":"…", "olfato":"…", "gusto":"…" } } ],   // sin nada secreto
  "questions": [ { "wineIndex":0, "fase":"vista", "prompt":"…", "options":["…","…","…","…"] } ]
  // 1 por fase sensorial + 1 de gamificación por vino (~16). SIN correctIndex.
}
```
El host difunde por Realtime la pregunta activa (enunciado+opciones) — sustituye a `getQuestion()`/`DEMO_WINES`.

### 2. `quiz-close` — al cerrar una pregunta (quiz→reveal)
**In:** `{ code, wineIndex, fase, answers: [ { playerId, optionIndex, seq } ] }`
La función (que tiene la respuesta) valida y **puntúa** (base + bonus por orden de llegada, con
`points_base`/`bonus_max` de `game_settings`) — mueve `computeAwards` al backend (A1).
**Out:** `{ correctOptionIndex, awards: { "<playerId>": <points> }, perPlayer: [ { playerId, correct } ] }`
El host aplica los `awards` al marcador y difunde el resultado.

### 3. `session-finish` — en `final_podium`
**In:** `{ code, host_name, pack_tier, players: [ { playerId, name, points, position, photo? } ] }`
(`photo` = data-URL solo del ganador). Persiste `game_sessions` + `game_session_players` y sube la foto
del ganador al bucket `winners` (§5.9). **Out:** `{ ok, session_id }`. Alimenta `ranking_mensual`.

## Dónde lo llamará el cliente (la costura, en NUESTRO lado)
- `quiz-bootstrap` → al montar la Sala (`use-room-channel.ts`, host) → reemplaza `DEMO_WINES`/`getQuestion`.
- `quiz-close` → en `advance()` al cerrar `quiz→reveal` → reemplaza el `computeAwards` cliente (§5.5).
- `session-finish` → al entrar en `final_podium`.
- `settings` → reemplaza los `FASE_SECONDS` (§5.3) y `BASE`/`BONUS` (§5.5) hardcodeados.

## Reconciliación de taxonomía (cliente ↔ BD)
El cliente (`src/lib/taxonomy.ts`) usa labels propios; la BD usa slugs en `wine_classifications`.
Al cablear, el cliente **leerá las labels desde `quiz-bootstrap`** (de `wine_classifications`), así que
`taxonomy.ts` queda como el enum `WineType` + fallback. Mapeo de referencia (label cliente → slug BD):

| Categoría | Cliente (`taxonomy.ts`) | BD (`wine_classifications.slug`) |
|---|---|---|
| blanco | "sobre lías" | `lias_sin_battonage` / `lias_con_battonage` |
| blanco | "depósito inerte" | `deposito_inerte` |
| blanco | "barrica" | `barrica_crianza` / `barrica_reserva` / `barrica_gran_reserva` |
| espumoso | "blanco" | `color_blanco` |
| espumoso | "rosado" | `color_rosa` |
| tinto/cava | "gran reserva" | `gran_reserva` |
| (resto: joven/cosecha/roble/crianza/reserva/paraje/brut nature/extra brut/seco) | igual | igual (con `_`) |

## Lo que NO cambia (sigue en el cliente, Realtime)
Presence (quién está), estado de la máquina (`stage/wineIndex/fase/step`), envío de respuesta del
jugador (broadcast al host), foto en presence (§5.11), cuenta atrás cosmética (§5.3). Solo se mueven al
backend: servir preguntas (sin respuesta), puntuar y persistir el cierre.

## Seguridad / notas
Anon llama a las funciones; la función usa service_role internamente. Validar `code` e inputs;
rate-limit por IP/sala; `quiz-bootstrap` **nunca** devuelve `correct_answer`. Ideal: la función deriva
las preguntas que falten de la ficha+taxonomía (FR-12) y `wines_question_readiness` avisa si un pack no
está listo.

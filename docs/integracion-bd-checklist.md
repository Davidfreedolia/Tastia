# Checklist de integración BD ↔ cliente (§5.6b) — para validar end-to-end

*El cliente (en `dev`) ya llama a las 3 edge functions con FALLBACK a demo. Para que el modo **BD** real
funcione, las functions de Salvador deben devolver EXACTAMENTE estos campos (mismos nombres/forma). Si no
coinciden, el cliente cae a demo (badge "Datos demo") o no puntúa — sin romperse. Esto es lo que el
cliente LEE de verdad (extraído de `src/lib/quiz-source.ts` y `src/lib/session-finish.ts`).*

> Fuente cliente: `quiz-source.ts` (bootstrap/close) · `use-room-channel.ts` (orquestación) · `session-finish.ts` (payload).

---

## 1. `quiz-bootstrap`

**El cliente ENVÍA:** `{ code }` (string; hoy el código de sala, p.ej. "TEST").

**El cliente ESPERA** (`data`, no `data.data`):
```jsonc
{
  "settings": {                 // si falta o algún tiempo no es número finito > 0 → cae a DEMO
    "time_vista_s": 30,         // number
    "time_olfato_s": 30,        // number
    "time_gusto_s": 45,         // number
    "time_gamificacion_s": 30,  // number
    "points_base": 100,         // number (no usado en cliente BD; scoring es server-side)
    "bonus_max": 50             // number (idem)
  },
  "questions": [                 // si vacío → cae a DEMO (todo-o-nada)
    { "wineIndex": 0, "fase": "vista", "prompt": "…", "options": ["…","…","…","…"] }
    // 1 por fase sensorial + 1 de gamificación por vino (~16). SIN correctIndex/respuesta.
  ]
}
```
- ⚠️ Nombres EXACTOS: `wineIndex` (no `wine_index`), `fase` ∈ `vista|olfato|gusto|gamificacion`, `options` (array de strings).
- ⚠️ `fase` debe coincidir con las 4 fases del cliente. `wineIndex` 0-based (0..3).

## 2. `quiz-close`

**El cliente ENVÍA:** `{ code, wineIndex, fase, answers }` donde
`answers = { "<playerId>": { optionIndex: number, seq: number } }`.

**El cliente ESPERA** (`data`):
```jsonc
{
  "correctOptionIndex": 2,                 // number — índice en el `options` que sirvió bootstrap
  "correctLabel": "Tempranillo",           // string — texto a mostrar en el reveal
  "awards": { "<playerId>": 150 },         // number por jugador (se coerciona con Number())
  "revealedWine": { … }                    // opcional, solo en la última fase del vino (para el podio del vino)
}
```
- ⚠️ Si `quiz-close` da `error` o `data` vacío → el cliente NO puntúa esa ronda (sin marcar correcta). No inventa con demo.
- ⚠️ `correctOptionIndex` debe indexar el MISMO `options` que devolvió `quiz-bootstrap` para esa `(wineIndex,fase)`.

## 3. `session-finish`

**El cliente ENVÍA** (solo en modo BD, al entrar en el podio final, una vez):
```jsonc
{
  "code": "TEST",
  "host_name": "Sala",                     // hoy siempre "Sala" (no hay UI de nombre de host)
  "pack_tier": null,                       // hoy null — ¿lo necesitas? ¿lo devuelve quiz-bootstrap?
  "players": [
    { "playerId": "…", "name": "…", "points": 300, "position": 1, "photo": "data:image/jpeg;base64,…" }
    // position 1-based por puntos; `photo` SOLO en el ganador (y solo si puntuó > 0)
  ]
}
```
**El cliente ESPERA:** que NO devuelva `error` (solo comprueba `{ error }`); idealmente `{ ok, session_id }`.

---

## Preguntas abiertas para Salvador (coordinar)

1. **`pack_tier`:** hoy las salas son solo `code` (sin pack). ¿`session-finish` lo necesita? ¿`quiz-bootstrap` debería devolver el `pack_tier` de la sala para que el cliente lo propague? Por ahora va `null`.
2. **`code`:** ¿`quiz-bootstrap`/`quiz-close` aceptan un código de sala arbitrario (p.ej. "TEST") y derivan un pack demo/por defecto, hasta que exista el flujo de compra/activación? El test usa "TEST".
3. **Idempotencia de `session-finish`:** ¿es idempotente por sesión (dedupe server)? El cliente no manda clave de idempotencia todavía (ver `deferred-work.md` §5.6b-B).

---

## Cómo probar (preview de `dev`)

**Ahora mismo (sin deploy) — modo DEMO:** en el preview, `/room/TEST` (Sala) + `/play/TEST` (móvil):
- Debe jugar de punta a punta con badge **"Datos demo"**; al podio final NO llama a `session-finish`.

**Cuando Salvador despliegue (`supabase functions deploy`) — modo BD:**
- [ ] La Sala arranca SIN badge "Datos demo" (→ `quiz-bootstrap` respondió bien con settings+questions válidos).
- [ ] La cuenta atrás usa los tiempos de la BD; editar un tiempo en `/admin` → "Gamificación" cambia la duración.
- [ ] Al cerrar cada pregunta, el reveal marca la opción correcta (de `quiz-close`) y reparte puntos.
- [ ] En la última fase de cada vino llega `revealedWine` (ficha del vino).
- [ ] Al podio final aparece **"Resultado guardado"** y se crea fila en `game_sessions`/`game_session_players` + foto del ganador en el bucket `winners` → la vista `ranking_mensual` lo refleja.
- [ ] Anti-spoiler: el cliente del jugador NO recibe la respuesta antes del reveal (las respuestas viven en la edge function).

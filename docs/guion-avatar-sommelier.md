# Guion del avatar-sommelier — guía para Andrés (Workstream C, §5.4)

> Guía para construir el **avatar-sommelier de IA** que modera la cata en vivo. Está **anclada en la máquina
> de estados YA implementada** (`src/lib/session.ts` / `use-room-channel.ts`), no solo en el blueprint, para
> que sepas exactamente **cuándo** actúa el avatar y **con qué datos**. El motor del juego, la puntuación y
> el anti-spoiler ya están hechos; tú añades **cara + voz + cerebro** en la Sala.

---

## 1. Dónde vive el avatar (y por qué)

- El avatar se renderiza **una sola vez por sesión, en el TABLERO central** (la Sala, ruta `/room/$code`),
  NO en cada móvil → **1 stream por grupo, no N**. Los móviles (`/play/$code`) solo reciben datos por
  Realtime y muestran botones de respuesta. **Coste:** ~0,10 €/min de avatar + LLM + ElevenLabs; una cata
  de ~75 min ≈ ~7,5 € → asumible con packs de 80–160 € **solo con 1 stream por grupo**. Fija duración máx.
- **Modo "lite":** traemos nuestro LLM (cerebro) + nuestra voz (**ElevenLabs**, castellano); el proveedor de
  avatar (HeyGen LiveAvatar / Tavus / Anam / Simli — decisión abierta, ver §6) solo pone cara + lip-sync.
- Tu componente vive en la Sala y **se monta junto al estado del juego**; recibe el `RoomState` y reacciona.

---

## 2. El contrato técnico: el avatar reacciona al `RoomState`

El host (Sala) es **autoritario** y emite el estado por Supabase Realtime. Tu avatar **no decide el tiempo**:
escucha los cambios de `RoomState` y, en cada transición relevante, invoca al cerebro (LLM) → voz → avatar.

`RoomState` (de `src/lib/session.ts`) — lo que recibes en la Sala:
```
stage:  "lobby" | "playing" | "wine_podium" | "final_podium"
wineIndex: 0..3          // vino actual (4 vinos)
fase:   "vista" | "olfato" | "gusto" | "gamificacion"   // solo significativo en "playing"
step:   "quiz" | "reveal"                                 // solo significativo en "playing"
activeQuestion?: { prompt, options[] }   // pregunta SIN respuesta (anti-spoiler)
reveal?: { correctOptionIndex, correctLabel, revealedWine }  // SOLO presente en step "reveal"
scores: Record<playerId, number>         // marcador acumulado
lastAward?: Record<playerId, number>     // "+X" de la última pregunta
deadline?: number                        // ms absolutos de fin del quiz (cuenta atrás)
source: "bd" | "demo"
```
También dispones (en la Sala, vía `useRoomChannel`) de `participants` (nombres/foto) y de quién ha respondido.

**Cómo engancharte (recomendado):** un efecto que observe `RoomState` y dispare al avatar en cada transición
`(stage, wineIndex, fase, step)`. Trata cada transición como un **evento** (ver tabla §4). Usa una clave
`${stage}:${wineIndex}:${fase}:${step}` para no repetir locución en re-renders.

---

## 3. La ficha de sesión (qué se le inyecta al cerebro en cada turno)

El LLM necesita contexto en cada intervención. Componla con:
- **Pack:** categoría (Winelover/Enology/Deluxe), nº de vinos (4).
- **Grupo:** nombres de `participants`, nº de personas, nivel declarado (si se captura en Calibración).
- **Estado:** `stage`, `wineIndex` (1–4 para hablar), `fase`, `step`, `scores` (marcador).
- **Reglas:** qué se adivina por fase, puntos (`points_base`/`bonus_max` de `game_settings`).
- **Ficha del vino actual** (vista/nariz/boca, maridaje, curiosidad y **pistas graduadas** principiante/medio/
  experto) + su **identidad** (nombre/bodega/D.O./variedad/añada/precio).

> ⚠️ **De dónde salen los datos del vino (cross-lane, coordinar con Salvador):** la **identidad** del vino es
> secreta hasta la Revelación. El cerebro del avatar la conoce para guiar, pero **NUNCA** debe viajar al
> cliente del jugador. Hoy las respuestas reales viven en la edge function (`quiz-close`) y el motor demo es
> **host-only** (acabamos de aislarlo del bundle de `/play`). Para el avatar hace falta una **fuente
> server-side de la "ficha de cata"** (notas + pistas + identidad) que alimente al LLM SIN exponerla a los
> móviles — idealmente una edge function nueva (p.ej. `avatar-brief`) o el LLM llamado desde el servidor.
> Define este contrato con Salvador (BD/edge) antes de implementar.

---

## 4. El guion fase a fase, mapeado a los estados REALES

> 🔒 **Regla de oro (anti-spoiler):** mientras `step === "quiz"` el avatar CONOCE el vino pero **no revela**
> nombre/bodega/variedad/precio/añada. Solo guía los sentidos y da pistas del nivel pedido. La identidad se
> dice SOLO cuando llega `step === "reveal"` (usa `reveal.correctLabel`/`reveal.revealedWine`).

| Evento (transición de `RoomState`) | Fase del guion | Qué dice/hace el avatar |
|---|---|---|
| `stage: lobby` (al montar) | **0 · Bienvenida** | Saluda, nombra a los presentes, baja la pomposidad ("ni exámenes ni respuestas tontas"), crea ambiente. NO revela nada. |
| `stage: lobby → playing` (host pulsa "Empezar") | **1 · Calibración & ritual** | Explica el ritual (funda de licra = cata a ciegas, temperatura, servir), cómo se juega y se puntúa. *(Si capturáis nivel del grupo, ajústalo aquí.)* |
| `playing · wineIndex N · fase=vista · step=quiz` | **2.1 Servir + Vista** | "Servíos el vino nº N con la funda, sin mirar la etiqueta. Mirad color e intensidad." Lanza la pregunta (`activeQuestion.prompt`). Pista del nivel. SIN revelar. |
| `playing · fase=olfato · step=quiz` | **2.2 Nariz** | "Removed y oled: ¿fruta, flores, madera…?" Pistas graduadas. |
| `playing · fase=gusto · step=quiz` | **2.3 Boca** | "Un sorbo: ¿ácido, tánico, dulzor, cuánto dura?" |
| `playing · fase=gamificacion · step=quiz` | **2.4 Quiniela** | "¡A apostar en el móvil! Tenéis `deadline` segundos." Anima; comenta la cuenta atrás. |
| cualquier `step: quiz → reveal` | **Revelación de la fase** | AHORA sí: di la respuesta correcta (`reveal.correctLabel`), comenta, y reparte/celebra los puntos (`lastAward`/`scores`). En la última fase, `reveal.revealedWine` trae la ficha completa del vino → suéltala con una curiosidad. |
| `stage: playing → wine_podium` | **Podio parcial** | Proclama el ranking acumulado tras el vino N (`scores`). Propón seguir ("¿listos para el siguiente?"). |
| `wine_podium → playing` (siguiente vino) | vuelve a **2.1** con N+1 | — |
| `stage: → final_podium` | **3 · Cierre & podio** | Corona al ganador con gracia, reparte "títulos" gamificados, agradece y recomienda el siguiente paso (subir de gama; packs futuros solo si existen, si no "Próximamente"). |

**Mientras un quiz está abierto** (entre `quiz` y `reveal`) el avatar puede improvisar/animar, pero **no avanza
la fase**: la avanzan el host o el temporizador (`deadline`). Puede *proponer* avanzar y esperar.

---

## 5. Lo que ya existe vs lo que construyes tú

**Ya hecho (no lo toques, consúmelo):**
- Máquina de estados + transiciones (`session.ts` `advanceState`, `RoomState`), host-autoritario por Realtime.
- Pregunta sin respuesta (`activeQuestion`) + revelación (`reveal`) + puntuación + marcador, anti-spoiler.
- La Sala (`/room/$code`) ya renderiza el estado; ahí montas el avatar.

**Tu Workstream C:**
- Componente del avatar en la Sala que **observa `RoomState`** y dispara locución por transición (tabla §4).
- Integración del **proveedor de avatar** (WebRTC, modo lite) + **voz ElevenLabs (ES)** + lip-sync.
- **Cerebro (LLM):** prompt del sommelier (tono anti-pompós, adaptación de nivel, guion §4, pistas graduadas,
  regla anti-spoiler), alimentado con la **ficha de sesión** (§3).
- **Control de coste:** 1 stream por grupo, duración máx., registrar minutos/tokens (p.ej. tabla `moderator_turns`).

**Costuras:**
- **D→C (estado):** tú lees `RoomState` (ya emitido por el host). Sin cambios en el motor.
- **B/Salvador→C (datos del vino):** necesitas la **ficha de cata server-side** (§3) con la identidad secreta;
  acuérdala con Salvador (edge function `avatar-brief` o equivalente). NO expongas la identidad al jugador.
- **C→E (render):** Quique integra el look del avatar en el diseño de la Sala.

---

## 6. Decisiones abiertas (cerrar antes/durante el spike)

- **Proveedor de avatar:** HeyGen LiveAvatar / Tavus CVI / Anam / Simli — tras un **spike comparativo**
  (requisito: latencia <300 ms + interrumpible). Anam ~180 ms es buen candidato por coste.
- **Modelo LLM** del sommelier + **presupuesto** de tokens y minutos de avatar por sesión.
- **Fuente de la ficha de cata** server-side (con Salvador): qué edge function y qué campos.
- **Spike de corte fino** (recomendado antes de comprometer calendario): 1 vino, el avatar hablando en una
  transición real de `RoomState`, voz ES + lip-sync, midiendo latencia y coste.

---

## 7. Resumen para empezar

1. Monta un componente en la Sala que reciba `RoomState` + `participants`.
2. Detecta transiciones `(stage, wineIndex, fase, step)` → mapea a la tabla §4.
3. Pide al cerebro (LLM) el texto del turno con la ficha de sesión (§3) **respetando el anti-spoiler**.
4. Locuta con ElevenLabs + renderiza el avatar (modo lite, 1 stream).
5. Para el reveal/puntos, usa `reveal` + `lastAward`/`scores` (ya vienen en el estado).
6. Coordina con Salvador la **ficha de cata server-side** (identidad secreta del vino para el cerebro).

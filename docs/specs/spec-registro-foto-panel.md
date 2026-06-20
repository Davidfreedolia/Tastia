---
title: 'Cata gamificada — Registro con foto + panel de participantes en la Sala (§5.11)'
type: 'feature'
created: '2026-06-20'
status: 'done'
baseline_commit: '087afea'
context: ['docs/prd-cata-gamificada/prd.md', 'docs/specs/spec-estructura-sesion-rondas.md', 'docs/specs/spec-motor-quiz.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Hoy el jugador entra solo con su nombre y la Sala lo muestra como una línea de texto.
§5.11 (FR-18/19/20) quiere: foto opcional al unirse, un panel de participantes en la Sala con
foto+nombre+puntos junto al avatar, y un halo de respuesta (verde=respondió / rojo-opaco=no) durante
el quiz, alimentado por `answeredIds` (§5.2).

**Approach:** Capturar la foto en el Companion, reducirla en cliente (~128px JPEG) y llevarla como
**data-URL en la metadata de presence** (no Storage): es ligera y se borra sola al salir (encaja con
la sesión efímera). La Sala renderiza el panel + halo desde `participants` + `answeredIds`. La
**persistencia del ganador para el ranking es §5.9** (al `final_podium` tomará la foto del ganador de
presence y la persistirá): §5.11 solo provee la foto en vivo.

## Product Decisions
- **Foto en vivo = data-URL (~128px JPEG) en presence**, no Storage. Auto-efímera, zero infra/coste.
  **Ajusta la assumption A8 del PRD** (Storage → presence; persistencia del ganador se mueve a §5.9).
- **Persistir al ganador (foto+nombre+puntos) para el ranking = §5.9**, no §5.11 (cross-ref).
- Captura con `<input type="file" accept="image/*" capture="user">` (abre la cámara en móvil; simple).
- Foto **opcional** (inicial/avatar si no), solo al unirse (botón "Sin foto").
- **Halo solo en la Sala** durante `quiz` (el Companion mantiene su propio feedback de §5.2).
- **Panel único de teselas** (foto/inicial + nombre + puntos) presente siempre; halo activo solo en `quiz`.

## Boundaries & Constraints
**Always:** foto reducida en cliente antes de entrar en presence; el halo es función pura de
pertenencia a `answeredIds` (no recalcula nada); copy honesto (sin foto → inicial/avatar); reutilizar
presence + el modelo §5.1/§5.2.
**Ask First:** subir fotos a Storage o persistir cualquier dato (eso es §5.9); aumentar el tamaño de
la foto en presence por encima de ~10KB.
**Never:** puntuación real (§5.5 — `scores` de contrato); temporizador (§5.3); reconocimiento facial
o cualquier uso de la foto más allá de mostrarla; persistir TODAS las fotos; tocar el flujo de compra.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Unirse con foto | el jugador toma/elige una foto en el join | se reduce a ~128px JPEG (data-URL) y entra en presence con `name`+`photo` | foto demasiado grande/ilegible → se omite y entra sin foto (inicial) |
| Unirse sin foto | pulsa "Sin foto" / no elige | entra con inicial/avatar por defecto | — |
| Panel (lobby/quiz/podio) | participantes presentes | una tesela por jugador: foto o inicial + nombre + puntos | sin jugadores → "Nadie se ha unido" |
| Halo en quiz | `step=quiz`, `answeredIds` | tesela con halo VERDE si `id ∈ answeredIds`, ROJO/opaco si no | — |
| Fuera de quiz | `step≠quiz` (reveal/podios/lobby) | sin halo verde/rojo (estado neutro) | — |
| Jugador sale | presence drop | su tesela desaparece del panel | — |

</frozen-after-approval>

## Code Map
- `src/routes/play/$code.tsx` -- Companion: form de unión (solo nombre). Añadir captura de foto opcional + downscale. [verificado, feat/cata-quiz]
- `src/lib/use-room-channel.ts` -- presence `track({name,isHost})`; `participants` desde `presenceState`; expone `answeredIds`. Añadir `photo`. [verificado]
- `src/routes/room/$code.tsx` -- Sala: lista simple de jugadores + `Podium`. Reemplazar por panel de teselas + halo. [verificado]
- `src/lib/session.ts` -- tipo `Participant` (`{id,name,isHost,score}`). Añadir `photo?`. [verificado]

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/session.ts` -- añadir `photo?: string` a `Participant`; helper `initials(name)` (1–2 letras) para el avatar por defecto.
- [x] `src/lib/use-room-channel.ts` -- aceptar `photo?: string` en las opciones; incluirlo en `channel.track({ name, isHost, photo })`; leer `photo` de `presenceState` al construir `participants`.
- [x] `src/routes/play/$code.tsx` -- en el join: `<input type="file" accept="image/*" capture="user">` + downscale en cliente (canvas → ~128px, JPEG ~0.7 → data-URL) + botón "Sin foto"; pasar `photo` a `useRoomChannel`. Si la conversión falla, entrar sin foto.
- [x] `src/routes/room/$code.tsx` -- reemplazar la lista por un **panel de teselas** (foto o `initials` + nombre + puntos), presente en todas las fases; durante `quiz`, aplicar halo desde `answeredIds` (verde = respondió, rojo/opaco = no); en `wine_podium`/`final_podium` destacar el orden.
- [x] Test unitario: `initials(name)` (vacío, una palabra, varias palabras, espacios).

**Acceptance Criteria:**
- Given un jugador se une con foto, when entra, then su tesela en la Sala muestra su foto reducida; si pulsa "Sin foto", muestra su inicial.
- Given `step=quiz`, when un jugador entra en `answeredIds`, then su tesela pasa a halo verde; quien no ha respondido se ve rojo/opaco.
- Given `step≠quiz`, when se muestra el panel, then ninguna tesela tiene halo verde/rojo (neutro).
- Given un jugador sale de la sala, when deja presence, then su tesela desaparece del panel.
- Given `final_podium`, when se muestra, then el panel destaca al ganador (foto/inicial + nombre + puntos).

## Design Notes
La foto se reduce en cliente (canvas) a ~128px JPEG antes de entrar en presence, para mantener el
payload ligero (~5–10KB) — presence es el transporte y se limpia solo al salir. El halo es una
función pura de `answeredIds.has(id)` y solo se pinta en `quiz`. La persistencia del ganador (con su
foto, ya disponible en presence en el `final_podium`) la hará §5.9 subiendo SOLO esa foto a Storage;
§5.11 no toca Storage ni BD.

## Verification
**Commands:**
- `bun run build` -- expected: compila sin errores de tipos.
- `bun run test` -- expected: tests (incl. `initials`) en verde.

**Manual checks:**
- `/play/TEST` en el móvil: unirse con foto (la cámara se abre) y sin foto; `/room/TEST`: ver la tesela
  con foto/inicial; durante un `quiz`, responder en el móvil y comprobar que la tesela pasa a halo verde,
  y las no respondidas a rojo/opaco; al `final_podium`, ver al ganador destacado.

## Spec Change Log
- 2026-06-20 · Discovery (1 ronda) + APROBADA por David → `status: ready-for-dev`. Decisión clave:
  foto en vivo = **data-URL reducido en presence** (no Storage) → **ajusta la assumption A8 del PRD**;
  la persistencia del ganador (+foto) para el ranking se mueve a **§5.9**. Resto: `<input capture>`,
  foto opcional, halo solo en la Sala, panel único. Depende de §5.1 + §5.2 (rama feat/cata-quiz).
  Bloque `<frozen-after-approval>` bloqueado.
- 2026-06-20 · nch-dev: implementada en `feat/cata-foto-panel` (baseline `087afea`). Build + 24 tests OK.
  Revisión adversarial (3 revisores) → 7 patches: timeout de decode, guardas de tamaño in/out de la foto,
  submit bloqueado mientras procesa, `initials` surrogate-safe, empates en el podio, accesibilidad del
  avatar. Sin diferidos nuevos. → `done`.

## Suggested Review Order

**Captura y reducción de la foto (núcleo)**

- Punto de entrada: captura → reduce a ~128px JPEG con guardas (tamaño in/out + timeout de decode).
  [`photo.ts:24`](../../src/lib/photo.ts#L24)
- `loadImage` con timeout (nunca cuelga el flujo).
  [`photo.ts:76`](../../src/lib/photo.ts#L76)

**Transporte por presence (no Storage)**

- La foto viaja en la metadata de presence y se lee a `Participant`.
  [`use-room-channel.ts:169`](../../src/lib/use-room-channel.ts#L169)
- `initials` (avatar de respaldo, seguro con emojis).
  [`session.ts:69`](../../src/lib/session.ts#L69)

**Companion (alta)**

- Captura opcional + "Sin foto" + submit bloqueado mientras procesa.
  [`play/$code.tsx:34`](../../src/routes/play/$code.tsx#L34)

**Sala (panel + halo)**

- Panel de teselas + halo desde `answeredIds` (solo en quiz) + líder con empates.
  [`room/$code.tsx:217`](../../src/routes/room/$code.tsx#L217)
- Avatar (foto o iniciales).
  [`room/$code.tsx:304`](../../src/routes/room/$code.tsx#L304)

**Periféricos**

- Test de `initials` (incl. emoji).
  [`initials.test.ts`](../../src/lib/initials.test.ts)

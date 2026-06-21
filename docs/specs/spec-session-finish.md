---
title: '§5.6b-B — Persistencia de sesión al final del juego (session-finish)'
type: 'feature'
created: '2026-06-21'
status: 'ready-for-dev'
context: ['{project-root}/docs/edge-functions-contract.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Al terminar la partida (`final_podium`) no se persiste nada → el ranking (§5.9,
`ranking_mensual`) nunca recibe datos. La edge function `session-finish` (Salvador, PR #10) existe pero
el cliente no la llama.

**Approach:** Un efecto host-only que, al entrar en `final_podium` **en modo BD**, construye `players[]`
(ordenados por puntos → posición) + la foto del ganador (de presence §5.11) y llama a `session-finish`
(`functions.invoke`) **una sola vez** (guard de idempotencia). En demo no persiste. Si falla, no rompe
el podio.

## Product Decisions

- **Solo en modo BD** (`source === 'bd'`) -- no contaminar `ranking_mensual` con partidas demo/de muestra.
- **Auto-disparo una vez** al entrar en `final_podium` (guard como `closingRef`; `reset()` lo rearma).
- **Foto SOLO del ganador** (data-URL de presence §5.11) -- privacidad + contrato.
- **`pack_tier`:** a coordinar con Salvador (¿lo devuelve `quiz-bootstrap`?); por ahora `null`.
- Si `session-finish` falla: **no rompe el podio** (log + indicador "No se pudo guardar"); sin reintento agresivo.
- El **host (Sala) NO es jugador**: se excluye de `players[]`.

## Boundaries & Constraints

**Always:** solo el host dispara; solo si `source === 'bd'`; **una sola** llamada por partida (ref guard);
`players[]` = participantes con `!isHost` ordenados por `scores` desc → `position` (1-based); foto solo
del ganador (position 1); llamada vía `getSupabase().functions.invoke("session-finish", …)`.

**Ask First:** el origen/formato real de `pack_tier` (coordinar con Salvador); cualquier cambio al
contrato de `session-finish`.

**Never:** tocar edge functions (Deno, Salvador), el ranking de la landing, el avatar ni migraciones;
persistir en modo demo; subir fotos de jugadores que NO son el ganador.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Final en BD | `final_podium`, `source='bd'`, scores | construye payload + invoca `session-finish` 1×; indicador "Resultado guardado" | si falla → log + "No se pudo guardar"; podio intacto; sin reintento |
| Final en demo | `final_podium`, `source='demo'` | NO llama a `session-finish` (payload null) | — |
| Re-broadcast / re-entrada a final | guard ya disparado | no re-envía | — |
| Reset tras persistir | `reset()` | rearma el guard → la siguiente partida sí puede persistir | — |
| Empate de puntos | scores iguales | `position` por orden estable; foto del position 1 | — |
| Sin jugadores (solo host) | `players[]` vacío | no llama (nada que persistir) | — |

</frozen-after-approval>

## Code Map

- `src/lib/use-room-channel.ts` -- hook host-autoritario; `participants` ({id,name,isHost,score,photo?}), `state.scores`, `state.stage` (`final_podium`), `quizSourceRef.current.source`, `code`/`name` de `opts`; `reset()`. Añadir efecto host-only de `final_podium` + `finishedRef` + estado `finishState`.
- `src/lib/session-finish.ts` -- **NUEVO**: función pura que arma el payload.
- `src/lib/supabase.ts` -- `getSupabase()`; `functions.invoke`.
- `src/lib/session.ts` -- `RoomState` (`stage`, `scores`); solo lectura.
- `src/routes/room/$code.tsx` -- podio final (host): mostrar el indicador de `finishState`.
- `docs/edge-functions-contract.md` -- §3 `session-finish` (in `{code,host_name,pack_tier,players[]}`; out `{ok,session_id}`).

## Tasks & Acceptance

**Execution:**
- [ ] `src/lib/session-finish.ts` (NUEVO) -- `buildFinishPayload({ code, hostName, participants, scores, source }): FinishPayload | null` (PURO): si `source !== 'bd'` → `null`; si no, `players` = participantes con `!isHost`, ordenados por `scores[id]` desc (orden estable), mapeados a `{ playerId, name, points, position }` (1-based); la **foto solo** se añade al ganador (position 1, de `participant.photo`); `pack_tier: null`. Si no hay jugadores → `null`. Exportar tipos.
- [ ] `src/lib/session-finish.test.ts` -- orden + `position`, foto solo del ganador, `source='demo'` → null, sin jugadores → null, empate (orden estable), host excluido.
- [ ] `src/lib/use-room-channel.ts` -- `finishedRef` (guard) + `finishState: 'idle'|'saving'|'saved'|'error'`; efecto host-only cuando `state.stage === 'final_podium'`: si ya disparado → skip; `payload = buildFinishPayload({code, hostName: name, participants, scores: state.scores, source: quizSourceRef.current.source})`; si `null` → skip; marca `finishedRef` + `finishState='saving'`; `await functions.invoke("session-finish", { body: payload })`; éxito → `'saved'`; error → log + `'error'` (sin throw). `reset()` limpia `finishedRef` y `finishState='idle'`. Exponer `finishState`.
- [ ] `src/routes/room/$code.tsx` -- en `final_podium` (host), mostrar un indicador discreto según `finishState` ("Guardando resultado…" / "Resultado guardado" / "No se pudo guardar").

**Acceptance Criteria:**
- Given una partida en modo BD que llega a `final_podium`, when se entra, then `session-finish` se llama UNA vez con `players` ordenados por puntos (posición) + foto del ganador, y el host ve "Resultado guardado".
- Given una partida en modo demo, when `final_podium`, then `session-finish` NO se llama.
- Given un re-broadcast o re-entrada a `final_podium`, when ya se disparó, then no se reenvía.
- Given un `reset()` tras persistir, when termina una nueva partida en BD, then se puede persistir de nuevo.
- Given que `session-finish` falla, when se llama, then el podio sigue visible y el host ve "No se pudo guardar" (sin romper).

## Spec Change Log

- 2026-06-21 — Aprobada (ready-for-dev). Decisiones: persistir solo en modo BD; auto-disparo una vez
  (guard de idempotencia, `reset()` rearma); foto solo del ganador; `pack_tier` null (coordinar con
  Salvador); host excluido de `players[]`; lógica pura aislada en `session-finish.ts` (testeable).

## Design Notes

- **Guard de idempotencia** igual que `closingRef`/el cierre de §5.6b-A: `final_podium` se difunde y
  re-difunde (catch-up, presence sync), así que el efecto debe disparar una sola vez por partida; `reset()` lo rearma.
- **`pack_tier`:** el contrato lo pide, pero hoy las salas son solo `code` sin pack. Se envía `null` y se
  coordina con Salvador (idealmente `quiz-bootstrap` devolverá el `pack_tier` de la sala → se añadirá al `QuizSource`).
- **Foto:** solo la del ganador (privacidad + contrato); las demás no se suben.
- **Lógica pura aparte** (`session-finish.ts`) para testear orden/posición/ganador sin React ni red.

## Verification

**Commands:**
- `bunx tsc --noEmit` -- expected: sin errores.
- `bunx vitest run` -- expected: pasan `session-finish` + los existentes.
- `bun run build` -- expected: build OK.

**Manual checks:**
- Preview sin deploy (modo demo): al llegar al podio final NO se llama a `session-finish` (sin indicador de guardado o "demo").
- Con deploy (cuando Salvador despliegue): partida BD → al podio final aparece "Resultado guardado" y la sesión + foto del ganador quedan en la BD (alimenta `ranking_mensual`).

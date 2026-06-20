# Edge Functions — Cata gamificada (§5.6b)

Implementa [`docs/edge-functions-contract.md`](../../docs/edge-functions-contract.md).
Tres funciones, todas con **service_role**: la respuesta correcta NUNCA sale al
cliente. Clientes anónimos (host y jugadores entran por QR).

| Función | Cuándo la llama el cliente | In → Out |
|---|---|---|
| `quiz-bootstrap` | al montar la Sala (`use-room-channel.ts`) | `{code}` → `{settings, wines, questions}` (sin `correctIndex`) |
| `quiz-close` | en `advance()` al cerrar `quiz→reveal` | `{code, wineIndex, fase, answers[]}` → `{correctOptionIndex, awards, perPlayer}` |
| `session-finish` | al entrar en `final_podium` | `{code, host_name, pack_tier, players[]}` → `{ok, session_id}` |

## Derivación de preguntas (FR-12)
Decidido con David: la función **deriva** las preguntas; usa la autorada de
`game_questions` (§5.8 admin) si existe, y si falta la genera (`_shared/derive.ts`):
- **Sensoriales (vista/olfato/gusto):** la opción correcta es la nota de cata de
  ESE vino; los distractores, las notas del mismo sentido de los otros vinos de
  la sesión.
- **Gamificación:** rota variedad → clasificación → precio por vino (A6). Correcta
  de la ficha/taxonomía; distractores de un pool (otros vinos / catálogo / bandas).

**Determinismo:** el orden de opciones se siembra por `(wineId, fase)`, así
`quiz-bootstrap` y `quiz-close` derivan el MISMO orden → el `correctOptionIndex`
de cierre coincide con lo que vio el cliente. No se persiste la pregunta.

## Pendiente / a confirmar
- **`code` → vinos del demo** (`/room/TEST`, sin pedido): hoy = primeros N vinos
  activos. Confirmar set con David. `TODO(contrato)` en `_shared/wines.ts`.
- **Spoiler a vigilar:** el contrato incluye `grape`/`region`/`vintage` en el
  payload `wines`, que son la respuesta de las preguntas de variedad/D.O./añada.
  El cliente debe ocultarlos hasta el `reveal` (es su lado), o los quitamos del
  bootstrap. Avisado a David.
- **Validación:** escrito sin compilar local (no hay Deno aquí); se valida en
  `supabase functions deploy`.
- Rate-limit por IP/sala; bilingüe (`lang` → `_en`); tipos con <4 clasificaciones
  (espumoso/rosado), ver `deferred-work.md` (X) — el pool de catálogo lo mitiga.

## Estructura
- `_shared/` — `supabase.ts` (service_role), `cors.ts`, `http.ts`, `wines.ts`
  (resolución), `quiz-context.ts` (carga vinos+notas+taxonomía), `derive.ts`
  (derivación determinista), `scoring.ts` (`computeAwards`, §5.5).
- una carpeta por función con `index.ts` (`Deno.serve`).

## Deploy
Requiere la CLI de Supabase logada en el proyecto `tyuehzsqvjpjysxdihsh`:

```bash
supabase login
supabase link --project-ref tyuehzsqvjpjysxdihsh
supabase functions deploy quiz-bootstrap quiz-close session-finish
```

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase en runtime.

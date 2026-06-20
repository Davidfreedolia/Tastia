# Edge Functions — Cata gamificada (§5.6b)

Implementa [`docs/edge-functions-contract.md`](../../docs/edge-functions-contract.md).
Tres funciones, todas con **service_role**: la respuesta correcta NUNCA sale al
cliente. Clientes anónimos (host y jugadores entran por QR).

| Función | Cuándo la llama el cliente | In → Out |
|---|---|---|
| `quiz-bootstrap` | al montar la Sala (`use-room-channel.ts`) | `{code}` → `{settings, wines, questions}` (sin `correctIndex`) |
| `quiz-close` | en `advance()` al cerrar `quiz→reveal` | `{code, wineIndex, fase, answers[]}` → `{correctOptionIndex, awards, perPlayer}` |
| `session-finish` | al entrar en `final_podium` | `{code, host_name, pack_tier, players[]}` → `{ok, session_id}` |

## Estado: ESQUELETO — 2 decisiones pendientes del contrato
Bloqueadas a confirmar con David (marcadas `TODO(contrato)` en el código):

1. **Preguntas.** `quiz-bootstrap`/`quiz-close` leen de `game_questions` (hoy puede
   estar vacía). Falta decidir si se **siembran** o se **derivan** de
   `tasting_notes` + `wine_classifications` (FR-12). `wines_question_readiness`
   avisa si un pack no está listo.
2. **`code` → vinos.** `_shared/wines.ts` resuelve por `orders.access_code →
   order_wines`, con fallback a N vinos activos para el demo (`/room/TEST`).
   Confirmar el set de demo.

`quiz-close` y `session-finish` están completos; `quiz-bootstrap` queda a expensas
de (1) para servir preguntas reales.

## Estructura
- `_shared/` — `supabase.ts` (cliente service_role), `cors.ts`, `http.ts` (helpers),
  `wines.ts` (resolución de la partida), `scoring.ts` (`computeAwards`, §5.5).
- una carpeta por función con `index.ts` (`Deno.serve`).

## Deploy
Requiere la CLI de Supabase logada en el proyecto `tyuehzsqvjpjysxdihsh`:

```bash
supabase login
supabase link --project-ref tyuehzsqvjpjysxdihsh
supabase functions deploy quiz-bootstrap quiz-close session-finish
```

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase en runtime.

## Pendiente (post-esqueleto)
- Derivación de preguntas (FR-12) en `quiz-bootstrap`.
- Rate-limit por IP/sala y validación más estricta de inputs.
- Bilingüe: ahora sirve `_es`; añadir `lang` para servir `_en`.
- Manejar tipos con <4 clasificaciones (espumoso/rosado) → ver `deferred-work.md` (X).

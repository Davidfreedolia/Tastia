# Estado del proyecto — Cata gamificada de Tastia

*Documento de estado a 20 jun 2026. Recoge **todo lo construido** (por el equipo entero), lo que está
**en curso** y lo que **falta**, con ramas, PRs y enlaces. Proyecto cooperativo de 5.*

> **Repo:** https://github.com/Davidfreedolia/Tastia (privado) · ramas `main` (producción) y `dev` (integración)
> **Producción:** https://tastia.org — **todavía con la pantalla de acceso**; el juego vive en `dev` y previews. Se publica con `dev → main` cuando se decida.
> **Supabase:** proyecto `tyuehzsqvjpjysxdihsh` (cuenta aparte, plan Free).

---

## 1. Qué es

Catas de vino en grupo, gamificadas y moderadas en directo por un **sommelier-avatar de IA**. Compras
un pack físico (4 vinos + accesorios), escaneas un QR y juegas una **cata a ciegas** con amigos:
preguntas con tiempo, puntos, podio y ranking. Sin registro. Bilingüe ES/EN.

**El bucle de juego en vivo ya funciona de punta a punta** (sobre datos demo en el cliente): lobby →
por cada vino [Vista → Olfato → Gusto → gamificación, cada fase con quiz cronometrado → revelación] →
podio parcial → … ×4 → podio final.

---

## 2. Hecho — Cliente / juego (David)

Construido con el flujo **PRD → spec → dev** (cada feature con revisión adversarial). Specs en
`docs/specs/`, PRD en `docs/prd-cata-gamificada/`.

| Feature | Qué hace | PR | Estado |
|---|---|---|---|
| §5.1 Estructura de Sesión y Rondas | Máquina de estados `stage × vino × fase × step` (lobby → 4 vinos × fases → podios) | #1 | ✅ en `dev` |
| §5.2 Motor de Quiz | Pregunta + 4 opciones (deterministas), respuesta del jugador, señal "respondió" | #2 | ✅ en `dev` |
| §5.11 Registro + panel + halo | Foto opcional al unirse (en presence), panel de participantes en la Sala, halo verde/rojo | #3 | ✅ en `dev` |
| §5.5 Puntuación + podio | 100 base + bonus por rapidez, marcador en vivo, "+X", podios | #4 | ✅ en `dev` |
| §5.3 Temporizador | Cuenta atrás por fase (30/30/45/30) + cierre automático | #5 | ✅ en `dev` |
| §5.7 Taxonomía (código) | `taxonomy.ts` + pregunta de clasificación con distractores del mismo tipo | #6 | ✅ en `dev` |
| §5.6a Importador + datos | Importador CSV + `wines-demo.csv` (12 vinos reales) → al esquema de la BD | #8 | 🟡 PR abierto |
| Landing — copy honesto | Email a `tastia.org` + titular legal real | #9 | 🟡 PR abierto |

**Docs de coordinación (en `dev`):** `docs/edge-functions-contract.md` (contrato cliente↔backend),
`docs/AVANCE-cata-gamificada.md`, `docs/specs/deferred-work.md`.

---

## 3. Hecho / en curso — Compañeros

| Quién | Qué | PR | Estado |
|---|---|---|---|
| **Salvador** (`sahlvah`) | **Backend BD §5.6–§5.9**: `wine_classifications` + `wines.category/classification_id` (§5.7), `game_questions.fase` + subtipo `clasificacion` (§5.6), `game_settings` (§5.8), `game_sessions`/`game_session_players` + bucket `winners` + vista `ranking_mensual` (§5.9). `database.types.ts` regenerado. **Ya APLICADO en la Supabase de producción.** | #7 | 🟡 PR abierto (es la **fuente de verdad** de la BD) |
| **Andrés** | **Avatar-sommelier (§5.4)**: IA con cara y voz (iframe en la Sala) | — | 🔧 en curso |

> Sus `game_settings` (base 100, bonus 50, tiempos 30/30/45/30) **coinciden** con los del cliente; su
> §5.9 (ranking + foto del ganador) es justo la persistencia que necesitábamos. Encaja bien.

---

## 4. Reparto de carriles (para no pisarnos)

- **Salvador** → BD + **edge functions** (servir preguntas sin la respuesta, puntuar en backend, cerrar/persistir sesión).
- **Andrés** → avatar (§5.4).
- **David / cliente** → juego en vivo (hecho), **integración** cliente↔BD, landing/UI, y el **contrato** de las edge functions.
- **Quique RG, Ignacio AC** → (carriles por confirmar en el repo).

**Reglas:** nadie toca el carril del otro. El cliente NO toca migraciones/edge functions; el backend NO
toca `src/routes`/`use-room-channel`/`session.ts`. Merge: el #7 (BD) antes que el #8.

---

## 5. Qué FALTA

**Integración (lo más importante para que el juego use datos reales)**
- **§5.6b** — edge functions (`quiz-bootstrap` / `quiz-close` / `session-finish`, ya especificadas en
  `edge-functions-contract.md`) + **cablear el juego a la BD** (leer vinos/preguntas/ajustes de Supabase
  en vez de `DEMO_WINES`; puntuar en backend). Coordinar con Salvador.
- Alinear `taxonomy.ts` (cliente) con `wine_classifications` (BD) al cablear.

**Funcionalidad**
- **§5.8** — UI de **admin del juego** en `/admin` (gestionar preguntas/tiempos/puntuación/vinos). La BD
  ya existe (de #7); falta el panel.
- **§5.4** — avatar (Andrés): elegir proveedor (HeyGen/Anam/Tavus) + API key + control de coste.
- **Stripe en modo demo/test** — checkout completo: edge functions `create-checkout` + `stripe-webhook`
  + creación de pedido + recibo. Necesita la `sk_test_…`. (Comercio; coordinar quién lo lleva.)
- Importar **vinos reales del distribuidor** (cuando haya tarifa) con el importador (#8).

**Robustez (diferida — `docs/specs/deferred-work.md`)**
- **C** reconexión/persistencia (estado de sesión efímero; recarga del host pierde la ronda).
- **G** evento `ready` del jugador inerte.
- **T** `setTimeout` del cierre en pestaña en segundo plano.
- **X** tipos con <4 clasificaciones (espumoso/rosado) → pregunta con <4 opciones.

**Datos / legal / operación**
- Dirección legal real (sigue placeholder "C/ Exemple 1"); revisar si **autónomo** (quitar "Registro
  Mercantil") o **S.L.**
- **Go-live:** aplicar migraciones a prod (las de #7 ya están), proteger rama `main`, `dev → main` para
  publicar en tastia.org, rotar contraseña de BD (`Tastia_2026`).

---

## 6. Ramas y PRs

- **Fusionados a `dev`:** #1 §5.1 · #2 §5.2 · #3 §5.11 · #4 §5.5 · #5 §5.3 · #6 §5.7.
- **Abiertos:** **#7** (Salvador, BD — fuente de verdad) · **#8** (importador + datos) · **#9** (copy honesto).
- **Preview integrado (`dev`):** `https://tastia-git-dev-freedolias-projects-77c959bb.vercel.app` → probar en `/room/TEST` (Sala) + `/play/TEST` (móvil). *(Si el preview pide acceso, es la protección de Vercel.)*

---

## 7. Próximos pasos sugeridos

1. **Mergear #7** (BD = verdad) → luego #8 y #9.
2. **§5.6b con Salvador**: él implementa las 3 edge functions del contrato; nosotros cableamos el cliente a la BD.
3. **§5.8** admin del juego (cliente, sobre la BD ya hecha).
4. **Stripe demo** (comercio) + **avatar** (Andrés) en paralelo.
5. Cuando esté integrado y probado: **`dev → main`** para publicar el juego en tastia.org.

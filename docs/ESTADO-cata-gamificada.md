# Estado del proyecto — Cata gamificada de Tastia

*Documento de estado a 21 jun 2026. Foto completa: qué está hecho (equipo entero), qué está en curso,
qué falta, y un **checklist de go-live**. Proyecto cooperativo de 5.*

> **Repo:** https://github.com/Davidfreedolia/Tastia (privado) · ramas `main` (producción) y `dev` (integración, HEAD `348b07f`)
> **Producción:** https://tastia.org — **todavía con la pantalla de acceso**; el juego vive en `dev` y previews. Se publica con `dev → main` cuando se decida.
> **Preview de `dev`:** `https://tastia-git-dev-freedolias-projects-77c959bb.vercel.app` → `/room/TEST` (Sala) + `/play/TEST` (móvil).
> **Supabase:** `tyuehzsqvjpjysxdihsh` (cuenta aparte, plan Free).

---

## 1. Qué es y estado general

Catas de vino en grupo, gamificadas, moderadas por un **sommelier-avatar de IA**, con packs físicos a
domicilio. Cata a ciegas multijugador en vivo. Sin registro. Bilingüe ES/EN.

**El bucle de juego está completo y, además, ya lee y escribe en la BD** (settings, vinos, preguntas,
puntuación y persistencia del podio), **con fallback a demo** en cada paso. **Pendiente: validar la
integración end-to-end contra las edge functions reales** (requiere el deploy de Salvador) — hasta
entonces, en preview corre en **modo demo** (badge "Datos demo").

---

## 2. Hecho — Cliente / juego (David)  ·  todo en `dev`

| Feature | Qué hace | PR |
|---|---|---|
| §5.1–§5.3, §5.5, §5.11 | Máquina de estados, quiz cronometrado, puntuación/podios, foto+halo | #1–#5 |
| §5.7 Taxonomía (código) | `taxonomy.ts` + pregunta de clasificación | #6 |
| §5.6a Importador + datos | Importador CSV + 12 vinos demo (al esquema de Salvador) | #8 |
| Landing — copy honesto | Email `tastia.org` + titular legal real (David Castellà Gil) | #9 |
| **§5.8a Admin del juego** | Editor de `game_settings` (global + por pack) + panel readiness, en `/admin` | #12 |
| **§5.6b-A Quiz desde la BD** | `quiz-bootstrap` + `quiz-close` (settings/vinos/preguntas/scoring) + fallback demo | #13 |
| **§5.6b-B Persistencia** | `session-finish` al podio final (sesión + foto del ganador → ranking) | #14 |

Todas las features pasaron **PRD → spec → dev** con **revisión adversarial de 3 agentes**. Specs en
`docs/specs/`. Contrato cliente↔backend en `docs/edge-functions-contract.md`. Campos exactos a validar
en `docs/integracion-bd-checklist.md`.

---

## 3. Hecho / en curso — Compañeros

| Quién | Qué | Estado |
|---|---|---|
| **Salvador** (`sahlvah`) | **BD §5.6–§5.9** (tablas + `ranking_mensual` + bucket `winners`) | ✅ en `dev` (#7) |
| **Salvador** | **Edge functions** `quiz-bootstrap`/`quiz-close`/`session-finish` (anti-spoiler opción B) | 🟡 **PR #10 abierto, pendiente `supabase functions deploy`** |
| **Andrés** | **Avatar-sommelier (§5.4)** (IA con cara y voz, iframe en la Sala) | 🔧 en curso |

---

## 4. Integración cliente ↔ BD — el punto clave ahora

El cliente **ya está cableado** a las 3 edge functions con **fallback a demo** (nunca se rompe):
- `quiz-bootstrap` → settings + vinos + preguntas (sin respuestas).
- `quiz-close` → reveal + scoring server-side (anti-spoiler).
- `session-finish` → persiste la partida + foto del ganador → `ranking_mensual`.

**Falta validar end-to-end** contra las functions desplegadas (es donde aparecen los desajustes de
contrato). **Plan:** David + Salvador, cuando coincidan → deploy de #10 + recorrer
`docs/integracion-bd-checklist.md` en el preview. Hasta entonces el preview corre en demo.

---

## 5. Reparto de carriles

- **Salvador** → BD + edge functions (backend del juego).
- **Andrés** → avatar (§5.4).
- **David / nosotros** → cliente (juego + admin + integración) + landing.
- **Quique RG, Ignacio AC** → (por confirmar).

---

## 6. Qué falta

**Validación (lo más prioritario)**
- Validar la integración BD end-to-end (deploy de Salvador #10 + checklist).

**Features pendientes**
- **Stripe en modo demo/test** — checkout completo (`create-checkout` + `stripe-webhook` + pedido). Necesita la clave `sk_test_…`. (Comercio; carril propio.)
- **§5.4 Avatar** (Andrés) — proveedor + API key + control de coste.

**Diferido (`docs/specs/deferred-work.md`)**
- §5.8b banco de preguntas (admin) · §5.8c clasificación de vinos (admin) — bajo valor ahora (preguntas derivadas / importador ya clasifica).
- Anti-spoiler host-only (`DEMO_WINES` fuera del bundle del jugador) — riesgo real bajo (demo-only).
- Robustez §5.6b-B (idempotencia/dedupe, empate en cabeza, `host_name`, tamaño de foto).
- Robustez de sesión: C (reconexión/persistencia efímera), G (`ready`), T (timer en 2.º plano), X (tipos <4 clasificaciones).

---

## 7. Ramas y PRs

- **Fusionado a `dev`:** #1–#9, **#12** (§5.8a), **#13** (§5.6b-A), **#14** (§5.6b-B), #8 (importador).
- **Abierto:** **#10** (Salvador, edge functions — pendiente de fusionar/desplegar él).
- `dev` verde: `tsc` limpio · 91 tests · build OK.

---

## 8. Checklist de GO-LIVE (`dev → main` → tastia.org)

> Preparado, **no ejecutado**. Idealmente tras validar la integración BD.

**Bloqueante**
- [ ] **Validar integración BD** end-to-end (deploy #10 + checklist) — o decidir lanzar en modo demo.
- [ ] Fusionar **#10** (edge functions) a `dev`.
- [ ] **Decidir el lanzamiento:** ¿salir con badge "Datos demo" hasta que la BD esté lista (honesto), o esperar a BD?

**Honestidad / contenido** (regla de copy honesto)
- [ ] **Ranking de la landing:** hoy es **demo inventado** → Salvador iba a enchufar `ranking_mensual` real. Confirmar antes de publicar (o marcarlo claramente).
- [ ] **Stripe:** hoy "Próximamente" (honesto). Si entra el checkout demo, decidir si se publica.
- [ ] **Avatar (§5.4):** ¿entra en el lanzamiento o se rotula "Próximamente"?
- [ ] **Datos legales:** dirección real (hoy placeholder "C/ Exemple 1"); confirmar **autónomo vs S.L.** (el texto aún menciona "Registro Mercantil"). NIF/titular ya puestos (David Castellà Gil).

**Operación / seguridad**
- [ ] **Proteger la rama `main`** (branch protection).
- [ ] **Rotar la contraseña de BD** (`Tastia_2026`).
- [ ] Confirmar migraciones aplicadas en prod (las de Salvador ya están).
- [ ] `dev → main` → Vercel publica en tastia.org; verificar age-gate/acceso y el juego en producción.

---

## 9. Próximos pasos sugeridos

1. **Validar la integración BD** (David + Salvador): deploy #10 + checklist en el preview.
2. En paralelo (sin bloqueo): **Stripe demo** (si hay `sk_test_`) o cerrar diferidos (anti-spoiler host-only).
3. Cuando la integración esté validada → **ejecutar el checklist de go-live** y `dev → main`.

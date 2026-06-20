# Avance — Cata gamificada de Tastia

*Sesión 18–20 jun 2026. Todo construido con el flujo PRD → spec → dev (revisión adversarial).
Repo: https://github.com/Davidfreedolia/Tastia (privado · `main`=producción, `dev`=integración).*

**Total del cambio:** 23 archivos · +3.206 / −326 líneas — código 11 archivos (+1.820/−324), docs 9 archivos (+1.193).

---

## El bucle de cata en vivo, completo

| # | Feature | Qué hace | Commit | PR | Estado |
|---|---|---|---|---|---|
| §5.1 | **Estructura de Sesión y Rondas** | Máquina de estados `stage × vino × fase × step`: lobby → (por vino: Vista→Olfato→Gusto→gamificación, cada una quiz→reveal → **podio parcial**) ×4 → **podio final** | `52f929e` | [#1](https://github.com/Davidfreedolia/Tastia/pull/1) | ✅ en `dev` |
| §5.2 | **Motor de Quiz** | Pregunta + 4 opciones derivadas de la **nota de cata** (deterministas), respuesta del jugador y señal "respondió" | `3c6a115` | [#2](https://github.com/Davidfreedolia/Tastia/pull/2) | ✅ en `dev` |
| §5.11 | **Registro con foto + panel + halo** | Foto opcional al unirse (data-URL en presence, sin Storage); panel de participantes en la Sala (foto/inicial + puntos) con **halo verde/rojo** según hayan respondido | `a2931ba` | [#3](https://github.com/Davidfreedolia/Tastia/pull/3) | ✅ en `dev` |
| §5.5 | **Puntuación, marcador y podio** | Al cerrar cada pregunta: **100 base + bonus por orden** a los aciertos; acumula en el marcador; "+X" en la revelación; podios con puntos reales | `551a1f2` | [#4](https://github.com/Davidfreedolia/Tastia/pull/4) | ✅ en `dev` |
| §5.3 | **Temporizador + cierre automático** | Cuenta atrás por fase (30/30/45/30); la Sala manda el reloj; **auto-cierra** al llegar a 0 (reparte puntos); botón manual sigue | `d81321b` | [#5](https://github.com/Davidfreedolia/Tastia/pull/5) | 🟡 PR abierto (pendiente de fusionar) |

---

## Probar el juego completo (preview con las 5 features)

Base: `https://tastia-git-feat-cata-temporizador-freedolias-projects-77c959bb.vercel.app`

- Sala (TV): `/room/TEST`
- Companion (móvil): `/play/TEST`

> Los previews de las ramas ya fusionadas (#1–#4) se borraron al hacer merge; **este preview (PR #5) lleva TODO**.
> Al fusionar el #5, `dev` quedará completo.

---

## Documentación (en el repo, rama `dev`)

- **PRD:** `docs/prd-cata-gamificada/prd.md` (+ `client-questions.md`, `.decision-log.md`)
- **Specs (5, todas `done`):** `docs/specs/` — estructura, motor-quiz, registro-foto-panel, puntuación, temporizador
- **Pendientes de robustez:** `docs/specs/deferred-work.md`
  - **C** — reconexión/persistencia (estado de sesión efímero; recarga del host pierde la ronda)
  - **G** — evento `ready` del jugador inerte
  - **T** — `setTimeout` del host estrangulado en pestaña en 2º plano

## Calidad

build/tsc limpios · **36 tests** · cada feature pasó por **revisión adversarial de 3 agentes** + parches aplicados.

## Decisiones de producto clave

- La partida en vivo es **entre clientes** (anfitrión + invitados). **Tastia (empresa) = solo Admin**, prepara el contenido antes; no juega.
- Preguntas en **opción múltiple**, derivadas de la **nota de cata** + ficha del vino (banco demo hasta §5.6).
- Foto del jugador: **opcional**, **data-URL en presence** (no Storage; efímera). La persistencia del ganador (+foto) para el ranking se hará en §5.9.
- Bonus de rapidez **por orden de llegada** (la última respuesta cuenta); pasar a tiempo real sería un cambio aparte.

## Producción

**`tastia.org` todavía NO tiene el juego** — vive en `dev` y previews. Para publicarlo: **`dev` → `main`** cuando se decida.

## Próximos pasos

1. Fusionar **PR #5** (§5.3) a `dev`.
2. Elegir el siguiente bloque:
   - **A)** Contenido real: §5.7 taxonomía → §5.6 banco de preguntas → §5.8 admin del juego (gestionar vinos/preguntas reales; ahora son demo).
   - **B)** §5.9 persistencia + ranking (guardar ganador + foto).
   - **C)** §5.4 avatar-sommelier (el "wow"; requiere proveedor + coste).

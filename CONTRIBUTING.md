# Cómo trabajamos (equipo Tastia)

Somos 5. Para no pisarnos y no romper producción, seguimos estas reglas.

## Ramas (test antes de main)
- **`main`** = **producción**. Cada push a `main` despliega a Vercel (tastia.org). **No se empuja directo a `main`.**
- **`dev`** = **integración / test**. Vercel le da una **preview** propia para probar antes de producción.
- Flujo:
  1. Crea una rama de feature desde `dev`: `feat/<lo-que-sea>` (o `fix/…`).
  2. PR de tu rama → **`dev`**. Se revisa y se prueba en la preview de `dev`.
  3. Cuando `dev` está OK → PR **`dev` → `main`** (un responsable lo fusiona) → producción.
- Una persona por feature; ramas pequeñas y PRs frecuentes.

> Las previews de Vercel pueden estar tras login de Vercel (Deployment Protection). Si el equipo no
> tiene cuenta en el proyecto Vercel, se desactiva la protección para previews o se asigna
> `test.tastia.org` a la rama `dev` (Vercel → Settings → Domains).

## Revisión antes de fusionar
- Antes de un PR, pasa una **revisión de código** (con Claude Code: `/code-review`, o `/ce-code-review` para multi-revisor).
- No fusionar con tests/typecheck en rojo ni con secretos en el diff.

## Arquitectura modular (nada monolítico)
Cada workstream tiene **su carpeta**, para trabajar en paralelo sin conflictos:
```
src/
  routes/         # rutas TanStack — FINAS, solo enganchan features
  features/
    landing/      # secciones de la landing (hero, packs, ranking…)  ← trocear landing.tsx
    tasting/      # cata en vivo: realtime, máquina de estados, sala, companion
    catalog/      # productos, vinos, notas de cata
    commerce/     # checkout, pedidos, packs
    gamification/ # avatar, preguntas, puntuación
  lib/            # compartido: supabase, i18n, database.types, require-auth
  components/ui/  # shadcn (compartido)
```
Regla: si una ruta pasa de ~200 líneas, trocéala en componentes dentro de su `features/<dominio>/`.
**Pendiente:** `src/routes/landing.tsx` (~950 líneas) hay que partirlo en `features/landing/`.

Backend: ya es modular por dominio en `supabase/migrations/` (ver `docs/BACKEND.md`).

## Aprendizajes (el "agente que aprende de los errores")
- **Antes** de tocar algo (deploy, DNS, Supabase, Stripe…), lee **`docs/LEARNINGS.md`**.
- **Después** de resolver un fallo no obvio, **añade una entrada** ahí (fecha · problema · causa · fix).
- Así ni nosotros ni la IA repetimos el mismo error. Claude lee `AGENTS.md` + `LEARNINGS.md` cada
  sesión y aplica lo aprendido.

## Entorno local
- `bun install && bun dev`. Cada uno con su `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).
- Secretos (service_role, claves Stripe) **nunca** al repo.

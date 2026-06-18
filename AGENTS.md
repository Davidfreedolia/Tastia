# AGENTS.md — reglas de la casa (Tastia)

Catas de vino gamificadas con sommelier-avatar de IA. Equipo de 5, decisiones por consenso.

## Stack
- Front: TanStack Start + React 19 + Tailwind v4 + shadcn/ui, **bun**.
- Backend/datos: **Supabase** (Postgres + Realtime + Storage). Proyecto `tyuehzsqvjpjysxdihsh`.
- Deploy: **Vercel** (auto-deploy en cada push a `main`). https://tastia-eight.vercel.app

## Cómo correr en local
```
bun install
bun dev          # http://localhost:8080
```
Necesita `.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (gitignorado;
pedid los valores por el canal del equipo — la publishable key es pública).

## Reglas
- **Bilingüe ES/EN** en toda la UI y el contenido (en datos: columnas `_es` / `_en`).
- **Documentos en castellano.**
- **Copy honesta:** nada de testimonios, métricas o integraciones inventadas. Lo no construido = "Próximamente".
- **Nunca commitear secretos** (`.env`, `service_role`). La `publishable key` sí es pública.
- **Ramas:** feature → PR a `dev` (test/preview) → PR `dev` → `main` (producción). **Nunca directo
  a `main`** (`main` despliega solo a producción). Detalle en `CONTRIBUTING.md`.
- Dinero siempre en `*_cents` (integer).

## Estructura
- `src/routes/` — `index.tsx` (landing), `room/$code.tsx` (Sala), `play/$code.tsx` (Companion).
- `src/lib/` — `supabase.ts`, `session.ts` (contrato), `use-room-channel.ts` (Realtime), `wines.ts` (datos muestra), `i18n.tsx`.
- `supabase/migrations/` — esquema por dominio (ver `docs/BACKEND.md`).
- `docs/` — `ARCHITECTURE.md` (realtime), `BACKEND.md` (BD), `ROADMAP.md`.

## Docs clave
- **Cómo trabajamos** (ramas, arquitectura modular, skills): `CONTRIBUTING.md`
- **Aprendizajes / errores resueltos:** `docs/LEARNINGS.md` ← léelo antes de tocar deploy/DNS/Supabase
- Arquitectura de la cata en vivo: `docs/ARCHITECTURE.md`
- Diseño del backend: `docs/BACKEND.md`
- Roadmap: `docs/ROADMAP.md`

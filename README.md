# Tastia 🍷

Catas de vino en grupo, gamificadas y moderadas en directo por un **sommelier-avatar de IA**.
Compras un pack físico (4 vinos + accesorios), escaneas un QR y un sommelier guía una cata a ciegas
con tus amigos: apuestas, puntos y podio. Bilingüe **ES/EN**. Proyecto cooperativo de 5.

> **Estado:** en construcción. La web pública muestra una pantalla de acceso; detrás está toda la app.

---

## 🌐 Dónde está montado (accesos)

| Recurso | Dónde | Notas |
|---|---|---|
| **Web (producción)** | https://tastia.org · https://tastia-eight.vercel.app | Deploy automático al hacer push a `main` |
| **Hosting** | Vercel · proyecto **`tastia`** (team Freedolia, Hobby) | Framework TanStack Start |
| **Repositorio** | https://github.com/Davidfreedolia/Tastia (privado) | Ramas `main` (prod) y `dev` (test) |
| **Base de datos / Auth / Storage / Realtime** | Supabase · proyecto `tyuehzsqvjpjysxdihsh` (cuenta aparte, plan Free), región `eu-central-1` | |
| **Dominio** | `tastia.org` — DNS en **Cloudflare** (A `@`→76.76.21.21, CNAME `www`→cname.vercel-dns.com, **Solo DNS**) | |

**Acceso del equipo:** usuario compartido **`hola@tastia.org`** (creado en Supabase Auth). El email
viene prefijado en `/login`; solo hay que escribir la contraseña (compartida por el canal del equipo).

---

## ✅ Qué está montado

**Front (desplegado):**
- **Puerta de acceso:** `/` pantalla naranja con icono → `/login` (Supabase) → `/landing` (web completa).
  Sin sesión, `/landing` redirige a `/`.
- **Cata en vivo (multijugador, Supabase Realtime):**
  - `/room/:code` — Sala (pantalla grande): avatar [placeholder], marcador, control del host.
  - `/play/:code` — Companion (móvil): unirse, ronda activa, enviar apuesta.
  - Presence + broadcast + apuestas + **revelación con puntuación** (variedad/D.O./precio/añada) + **podio**.
- **Panel admin:** `/admin` (solo equipo logueado) — dashboard con contadores en vivo + CRUD de
  proveedores (patrón a extender). Enlace "Admin" en la cabecera de la landing.

**Backend (Supabase, 18 tablas + RLS):**
- CRM (`clients`), proveedores (`suppliers`), catálogo (`products`, `wines`, `tasting_notes`, `inventory`),
  finanzas (`purchases`, `purchase_items`, `supplier_invoices`, `orders`, `order_items`),
  packs (`pack_tiers` con seed Winelover/Enology/Deluxe, `pack_tier_components`, `order_wines`, `shipping_zones`),
  gamificación (`avatars`, `game_questions`), branding (`brand_assets`), admin (`admins`).
- Funciones: `is_admin()`, `assemble_order_pack()` (4 vinos random por banda de precio).
- Storage: buckets `products` (público), `branding` y `tasting-notes` (privados).
- Tipos TypeScript en `src/lib/database.types.ts`.

---

## 🚀 Empezar en local
```bash
bun install
bun dev          # http://localhost:8080
```
Necesita un `.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (pídelos al equipo; no se
commitean — la publishable key es pública pero el `.env` va en `.gitignore`).

---

## 🧭 Cómo trabajamos (reglas)
- **Ramas:** `feat/*` → PR a **`dev`** (test/preview) → PR **`dev` → `main`** (producción). **Nunca directo a `main`.**
- **Revisión** antes de fusionar (`/code-review`).
- **Arquitectura modular** por features (nada monolítico).
- **Aprendizajes:** lee y actualiza `docs/LEARNINGS.md` (memoria de errores).
- Detalle completo en **`CONTRIBUTING.md`** y **`AGENTS.md`**.

## 📚 Documentación
- `AGENTS.md` — reglas de la casa.
- `CONTRIBUTING.md` — flujo de ramas, arquitectura, skills.
- `docs/ARCHITECTURE.md` — arquitectura de la cata en vivo (Realtime).
- `docs/BACKEND.md` — diseño de la base de datos por dominios.
- `docs/LEARNINGS.md` — errores resueltos (léelo antes de tocar deploy/DNS/Supabase).
- `docs/ROADMAP.md` — hoja de ruta.

---

## 🗺️ Roadmap para terminar

**Producto / pago**
- [ ] **Stripe en modo test:** edge functions `create-checkout` + `stripe-webhook` (el webhook llama a
  `assemble_order_pack`, genera `access_code` + QR y el recibo). Necesita la `sk_test_…`.
- [ ] **Avatar del sommelier (el "wow"):** elegir proveedor (HeyGen / Anam / Tavus) + API key → iframe en la Sala.
- [ ] Vinos reales (ahora hay 4 de muestra en `src/lib/wines.ts`).
- [ ] Limpiar copy inventada de la landing (testimonios/ranking) → marcar lo no construido como "Próximamente".

**Datos / operación**
- [ ] Importar proveedores (CSV), crear productos/vinos con sus notas, subir imágenes (Supabase Studio o `/admin`).
- [ ] Definir componentes de cada pack (bolsa, copas, abridor, tarjetas, sobre).

**Ingeniería**
- [ ] **Trocear `src/routes/landing.tsx`** (~950 líneas) en `features/landing/` (desmonolitizar).
- [ ] Extender el CRUD de `/admin` a Productos, Vinos, Pedidos, Gamificación, Branding (patrón ya en Proveedores).
- [ ] Protección de rama en `main` (obligar PR).
- [ ] `docs/GAMIFICATION.md` (guion del avatar + preguntas) y `docs/STRIPE.md`.
- [ ] Persistencia de sesiones de cata (histórico/ranking real).

**Pendientes menores**
- [ ] Rotar la contraseña de BD (`Tastia_2026`).
- [ ] (Opcional, requiere Vercel/Pro) protección de previews y leaked-password.

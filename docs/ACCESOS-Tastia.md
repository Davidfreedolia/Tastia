# Tastia — Inventario de accesos y claves

> **Este documento NO contiene valores secretos.** Es un mapa: qué servicios usamos, dónde vive cada
> clave y quién tiene acceso. Los valores reales viven en **Vercel → Environment Variables** (server-side)
> y en el **gestor de contraseñas** del equipo. Nunca en git.
>
> Proyecto **privado de Freedolia**. Equipo: **David** (propietario de todas las cuentas) e **Isabel**.
> Estado a 2026-07-13.

---

## 1. Cuentas y servicios

| Servicio | Qué es | Identificador | Propietario / acceso |
|---|---|---|---|
| **GitHub** | Repositorio de código | `github.com/Davidfreedolia/Tastia` (privado) · ramas `main` (prod) / `dev` | David (owner). Isabel: *dar acceso como colaboradora* |
| **Vercel** | Hosting + CI/CD (deploy automático) | Proyecto **`Tastia`** (team Freedolia). Push a `main` → publica en tastia.org | David (owner) |
| **Supabase** | BD + Auth + Storage + Realtime | Proyecto **`Tastia`**, ref `tyuehzsqvjpjysxdihsh`, org `ioqaptxpvncplbanokzx`, región `eu-central-1`, Postgres 17, plan **Free** | David (cuenta aparte) |
| **Cloudflare** | DNS del dominio | `tastia.org` — A `@`→76.76.21.21, CNAME `www`→cname.vercel-dns.com, **Solo DNS** | David |
| **Stripe** | Pagos (checkout + webhook) | Cuenta en **modo TEST** (sin LIVE, sin cobro real) | David |
| **Resend** | Emails de recibo | API key + remitente | David |

**Dominios:** producción `https://tastia.org` (+ alias `tastia-eight.vercel.app`). Preview de `dev`:
`https://tastia-git-dev-freedolias-projects-77c959bb.vercel.app`.

---

## 2. Acceso de equipo a la app (login de `/admin`)

- Usuario **compartido** de Supabase Auth: **`hola@tastia.org`** (email prefijado en `/login`).
- Contraseña: en el **gestor de contraseñas** del equipo (no aquí).
- Flujo: enlace **Admin** en la landing → `/admin` → si no hay sesión, `/login` → tras entrar, `/admin`.

---

## 3. Variables de entorno (viven en Vercel · valores NO aquí)

Fuente canónica de nombres: [`.env.example`](../.env.example). Referencia de qué hace cada una:
[`docs/puesta-en-marcha.md`](puesta-en-marcha.md).

| Variable | Ámbito | Para qué | ¿Puesta? |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Cliente | URL del proyecto Supabase | ✅ |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Cliente | Clave **pública** (anon) — segura en el navegador | ✅ |
| `SUPABASE_URL` | Servidor | Igual que la de Vite (el webhook reutiliza `VITE_SUPABASE_URL`) | reutiliza |
| `SUPABASE_SERVICE_ROLE_KEY` | Servidor 🔒 | Bypasea RLS: guardar `orders`, validar `/activar`, edge functions | según activación |
| `SUPABASE_SERVICE_KEY` | Servidor 🔒 | Alias del anterior (mismo valor) | según activación |
| `STRIPE_SECRET_KEY` (`sk_test_…`) | Servidor 🔒 | Crear el pago (checkout) | según activación |
| `STRIPE_WEBHOOK_SECRET` (`whsec_…`) | Servidor 🔒 | Verificar la firma del webhook | según activación |
| `RESEND_TASTIA_API_KEY` (`re_…`) | Servidor 🔒 | Enviar el email de recibo + QR | según activación |
| `RESEND_FROM` | Servidor | Remitente del email (necesita **dominio verificado** en Resend) | pendiente |
| `DATABASE_URL` | Scripts | Solo `scripts/import-wines.mjs` (importar vinos) | opcional |

> 🔒 = secreto: **solo** en Vercel (server-side), nunca en el cliente ni en git. El runtime de las edge
> functions inyecta `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`; no necesitan secretos extra.

**Storage (buckets Supabase):** `products` (público), `branding`, `tasting-notes`, `winners` (privados).

---

## 4. Acciones de seguridad pendientes

- [ ] **Rotar la contraseña de la BD de Postgres.** La que aparece en docs antiguos está **comprometida**
      (quedó en git). Rotar en Supabase → *Project Settings → Database → Reset database password* y guardar
      la nueva **solo** en el gestor de contraseñas. Luego **borrarla de los docs** donde aún figura.
- [ ] **Dar acceso a Isabel** con el mínimo necesario: colaboradora en GitHub; miembro en Vercel/Supabase
      solo si va a operar infra (si no, le basta el usuario `hola@tastia.org` para `/admin`).
- [ ] **`RESEND_FROM`** con dominio verificado (hoy `onboarding@resend.dev` solo entrega a la cuenta Resend).
- [ ] Al pasar Stripe a **LIVE** (si algún día): claves `sk_live_…` + webhook live, y antes los
      endurecimientos de [`docs/specs/deferred-work.md`](specs/deferred-work.md) + compliance de alcohol.
- [ ] Proteger la rama `main` (branch protection) — hoy se hace push directo.

---

## 5. Dónde está documentado el resto

- **Estado maestro:** [`docs/ESTADO-COMPLETO-Tastia.md`](ESTADO-COMPLETO-Tastia.md)
- **Roadmap:** [`docs/ROADMAP.md`](ROADMAP.md)
- **Puesta en marcha (secretos Stripe/Resend paso a paso):** [`docs/puesta-en-marcha.md`](puesta-en-marcha.md)
- **Activar Stripe TEST:** [`docs/stripe-setup.md`](stripe-setup.md)
- **Prueba end-to-end (URLs):** [`docs/integracion-bd-checklist.md`](integracion-bd-checklist.md) §0

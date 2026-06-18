# Aprendizajes — memoria de errores de Tastia

Registro vivo para no repetir fallos. **Antes** de tocar deploy/DNS/Supabase/Stripe, lee esto.
**Después** de un fix no obvio, añade una entrada (fecha · problema · causa · fix).

---

## 2026-06-18 · Vercel servía 404 en TODAS las rutas
- **Causa:** el wrapper `@lovable.dev/vite-tanstack-config` **desactiva el plugin de Nitro fuera de
  Lovable** ("No Lovable context detected — skipping nitro deploy plugin") → no se genera el servidor SSR.
- **Fix:** en `vite.config.ts`, pasar `nitro: true` al `defineConfig`.

## 2026-06-18 · La app mostraba "Configura Supabase" en Vercel
- **Causa:** las variables `VITE_*` no se incrustaban en el build de Vercel.
- **Fix:** fallback público en `src/lib/supabase.ts` (URL + publishable key). La publishable key es
  pública por diseño y el repo es privado, así que es seguro. Las env vars siguen teniendo prioridad.

## 2026-06-18 · Cloudflare DNS → Vercel
- **Regla de oro:** los registros deben estar en **"Solo DNS" (nube GRIS)**, NO proxied (naranja),
  o Vercel se queda en "Invalid Configuration" y falla el SSL.
- Apex `tastia.org`: **A → 76.76.21.21**. `www`: **CNAME → cname.vercel-dns.com**.
- Un **CNAME apunta a un hostname, nunca a una IP** ("Content for CNAME record is invalid").

## 2026-06-18 · Supabase en cuenta aparte (free) + acceso del conector
- El proyecto Tastia está en una **cuenta Supabase distinta** (a propósito, para no pagar).
- Invitar la cuenta a la org **no basta**: el conector (OAuth) tenía permiso solo para la org
  anterior. Hay que **reconectar el conector** e incluir la org de Tastia para que tome el nuevo scope.
- Invitar un miembro a una org **no cambia la facturación** (Tastia sigue free). Lo que sí cobraría
  es **transferir** el proyecto a una org con 2 proyectos.

## 2026-06-18 · Avisos de seguridad de Supabase (aceptables en Free)
- **"Leaked password protection"**: es **Pro-only**. En Free no se puede activar → ignorar el aviso.
- **`is_admin()` SECURITY DEFINER**: es el **patrón estándar** recomendado por Supabase para evitar
  recursión de RLS → aceptable.
- **"RLS enabled, no policy"** en tablas internas: **intencional** (solo backend/service_role). El
  panel de Supabase Studio salta el RLS, así que desde ahí se gestiona todo igualmente.

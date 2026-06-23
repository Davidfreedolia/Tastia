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

## 2026-06-19 · Header transparente sobre Hero con vídeo
- **Contexto:** la landing tenía un header `sticky` con `bg-background/75` que dejaba una franja sólida
  sobre el vídeo del Hero, rompiendo la inmersión.
- **Patrón:** header pasa a `fixed top-0 inset-x-0`, transparente por defecto, y al hacer scroll
  (`window.scrollY > 8`) aplica `bg-cream/80 backdrop-blur-md`. El Hero queda en `top:0` con el vídeo
  visible bajo el header. Listener de scroll en `useEffect` con `{ passive: true }` y cleanup.
- **Cuidado:** al ser `fixed`, no reserva espacio. Si en el futuro se añade contenido por encima del
  Hero que sí necesite empujarse, hay que reintroducir un spacer (`h-16`) o volver a `sticky`.

## 2026-06-19 · `landing.tsx` tenía dos `<section className="py-14 md:py-20 bg-gold">`
- **Problema:** dos secciones distintas (`Values` y `FriendsTasting`) compartían exactamente la misma
  className. Buscar por className para localizar una sección es ambiguo y peligroso.
- **Regla:** al referirse a una sección en revisiones de diseño, citar el **nombre del componente**
  (`Values`, `FriendsTasting`…), no su className. Si dos componentes acaban con la misma firma visual,
  diferenciar el wrapper (p. ej. añadir `data-section="values"`).

## 2026-06-22 · Sync de rama muy atrasada (85 commits behind main)
- **Flujo seguro:** `git stash -u` → `git checkout main && git pull --ff-only` →
  `git checkout feat/* && git merge --ff-only main` → `git stash pop`.
- **Conflicto típico:** `src/routeTree.gen.ts` — es **autogenerado por TanStack Router**,
  jamás se edita a mano. En `git stash pop`, resolver con `git checkout --ours <file>`
  (queda la versión de la rama, que es la del nuevo `main`) y `git add`. El dev server
  lo regenera al arrancar.
- **Otros archivos del stash** suelen automergerse limpio cuando son cambios pequeños
  sobre código que el equipo ya reescribió en `main`. Revisar visualmente antes de
  commitear: el auto-merge puede producir resultados sintácticamente válidos pero
  semánticamente raros.
- **No tirar el stash hasta que arranque la app**: `git stash list` mantiene el respaldo.

## 2026-06-22 · Variables de entorno server-side tras sync con `main`
- El frontend ya tenía `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`, pero el código
  nuevo (Stripe checkout, recibo Resend, edge functions) lee variables **server-side** que
  hay que añadir al `.env` local y a Vercel:
  - `SUPABASE_URL` (mismo valor que el VITE_)
  - `SUPABASE_SERVICE_ROLE_KEY` + alias `SUPABASE_SERVICE_KEY`
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - `RESEND_TASTIA_API_KEY` (con fallback `RESEND_API_KEY`), `RESEND_FROM`
- **Regla:** mantener `.env.example` documentado y al día con TODAS las server keys
  (con comentarios sobre dónde obtenerlas y qué hace cada una). `.env.example` no se
  actualizó cuando llegaron los cambios → fácil olvidar una clave.
- **No pegar service_role en chat.** Editar `.env` localmente; el archivo está en
  `.gitignore` pero el chat queda en logs.

## 2026-06-22 · Migraciones Supabase: rol del developer no-DBA
- Las migraciones en `supabase/migrations/` son **archivos idempotentes que se aplican una
  sola vez** contra el proyecto compartido. Si otro miembro del equipo es owner de la BD,
  él las aplica; los demás solo necesitan **el repo sincronizado** (que trae los archivos
  + `src/lib/database.types.ts` regenerado).
- No correr `supabase db push` desde tu máquina si el responsable de la BD ya las aplicó
  → re-aplicarlas falla con "type already exists" etc.
- Para trabajo UX/UI puro: basta con el repo + `.env` apuntando al Supabase compartido.

## 2026-06-22 · Watermark de icono detrás de contenido (z-index/stacking)
- **Patrón:** dentro de un `position: relative` con varias capas, el icono "marca de agua"
  no debe usar `z-index: -1` — el negativo lo manda detrás de las capas hermanas del
  contenedor (chevrons, cards de fondo), no solo del texto.
- **Solución:** icono absoluto con `z-0` + opacidad baja (`color-mix(in oklab, var(--foreground) 14%, transparent)`),
  y el contenido (número, h3, p) con `position: relative` + `z-10`. Todos quedan en el
  mismo stacking context, el icono debajo y el texto encima.
- **Si el número de encima tiene fondo translúcido**, los strokes del icono se ven a través.
  El "número en círculo encima del icono" exige fondo **sólido** del círculo, o subir mucho
  la transparencia del watermark.

## 2026-06-22 · Imports de assets en Vite — `.png` vs `.jpg.asset.json`
- `import x from "@/assets/foo.png"` devuelve directamente la URL resuelta (string).
- `import x from "@/assets/foo.jpg.asset.json"` (wrapper de Lovable) devuelve un objeto
  con `.url`. Se usa `x.url` en el `src`.
- Al **sustituir** un asset, asegurarse del tipo de import para no terminar con
  `<img src="[object Object]">`.

## 2026-06-18 · Avisos de seguridad de Supabase (aceptables en Free)
- **"Leaked password protection"**: es **Pro-only**. En Free no se puede activar → ignorar el aviso.
- **`is_admin()` SECURITY DEFINER**: es el **patrón estándar** recomendado por Supabase para evitar
  recursión de RLS → aceptable.
- **"RLS enabled, no policy"** en tablas internas: **intencional** (solo backend/service_role). El
  panel de Supabase Studio salta el RLS, así que desde ahí se gestiona todo igualmente.

## 2026-06-23 · Arquitectura Sala/Companion + modo mock — referencia
Notas para iterar sobre `/room/$code` (host) y `/play/$code` (jugador) sin tener que releer
el código cada vez. Captura el contrato y los patrones visuales/estructurales asentados.

### Máquina de estados (§5.1)
`lobby → playing` (por vino N: `[vista, olfato, gusto, gamificacion]` cada una `{quiz → reveal}`)
`→ wine_podium` × `WINE_COUNT` (=4) `→ final_podium`. `RoomState` (en `src/lib/session.ts`)
expone: `stage`, `fase`, `step`, `wineIndex`, `scores`, `lastAward`, `activeQuestion`, `reveal`,
`deadline`, `source`. Anti-spoiler: el bundle del jugador NO contiene la respuesta correcta antes
del reveal — el host la difunde en `state.reveal` al cerrar la pregunta.

### Contrato `useRoomChannel` / mocks
`useRoomChannel({ code, role })` (en `src/lib/use-room-channel.ts`) es la fuente viva (Supabase
Realtime). `mockRoom(scenario)` y `useMockPlayerRoom(scenario)` (en `src/lib/mock-room.ts`)
devuelven **el mismo shape** para que `$code.tsx` los consuma sin ramas. El host usa función
simple; el jugador usa **hook** (con `useState`) porque `submitAnswer` debe ser stateful en quiz.

### Query param `?mock=…`
- Host (`/room/$code?mock=…`): `quiz | reveal | wine-podium | final`, `?mock=1` → `reveal`.
- Jugador (`/play/$code?mock=…`): añade `lobby` y `?mock=1` → `quiz`.
- Salta el join/landing y monta directamente la UI con datos demo. Útil para iterar layout sin
  esperar a una sesión real.

### Tokens de diseño asentados
- Colores (`src/styles.css`): `--ink` (foreground), `--cream` (background), `--wine` (primary),
  `--gold`/`--olive`/`--blush`/`--green`/`--muted`. Exportados como `text-ink`, `bg-ink`, etc.
- Tipografía: `serif` (Fraunces) en h1–h4 y vía utility `.serif`; `Inter` por defecto.
- **Sin estilos inline** — todo CSS vive en `src/styles.css` (regla del usuario). Para imágenes
  de fondo de assets, definir clase en `styles.css` con `url("./assets/…")` (Vite resuelve relativo).
- Botón base (`src/components/ui/button.tsx`) lleva `rounded-none` embebido; los overrides via
  `className` ganan gracias a `cn()` + `twMerge`.

### Patrones visuales acordados (player + host)
- **Top bar fijo** (`/play` y `/room`): `fixed inset-x-0 top-0 z-10 flex justify-between gap-3
  bg-ink/50 px-5 py-3 text-cream`. Logo (cream `Tast` + white `IA`) + pill "Sala XXXX" agrupados a
  la izquierda; etiqueta de etapa a la derecha (alineada con el padding del header). Main debajo
  necesita `pt-20`.
- **Containers/cards**: `rounded-2xl` (1rem) con `bg-card` + borde `border-primary/40` o
  `border-border/60` según jerarquía.
- **Botones primarios** (`variant="wine"`): `h-14 rounded-lg` tanto en player como host.
- **Inputs**: `bg-[oklch(1_0_0)]`, `rounded-[8px]`, texto y placeholder `text-left`.
- **Opciones de quiz**: `h-14 rounded-lg`, base `border-muted bg-white`; selección
  `border-primary bg-primary/15`; reveal correcta `border-green-600 bg-green-600/15`.
- **Centrado vertical en viewport**: `flex min-h-[calc(100vh-5rem)] items-center` (el 5rem
  descuenta el top bar fijo). Aplicado a quiz/podio del jugador.
- **Background `/play`**: clase `.play-bg` (en `styles.css`) layerea un overlay `--ink 60%` sobre
  `assets/product-friends.jpg`. Se aplica en welcome/lobby/quiz/reveal/podios.

### Identidad "Tú" en mock del jugador
`useMockPlayerRoom` inyecta un participante `id="me"` con score verosímil (3.º parcial / 4.º final).
Permite ver medallas, ranking, "+X" tras acertar y la tesela propia destacada.

### Datos demo (`source="demo"`)
Cuando la edge function no responde, `RoomState.source = "demo"` y aparecía un badge "Datos demo"
en `/play`. Se quitó del companion en este sprint para limpiar el top; sigue activo en el host.

### Iframe sommelier (host)
`/room/$code` pinta de fondo un iframe a pantalla completa (YouTube `ycKMCy8JAco` como placeholder
del avatar parlante). Los paneles del host viven sobre ese iframe con `z-10`. El placeholder se
sustituirá por HeyGen/Anam/Tavus.

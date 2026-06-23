-- Tastia · 0013 — Endurecimiento de `orders` (idempotencia del webhook + caducidad de activación)
--
-- De la revisión adversarial de §Stripe-B1/§Activar (deferred-work.md):
--   1. UNIQUE(stripe_session_id): hoy la idempotencia es check-then-insert, que cubre los
--      reintentos SECUENCIALES de Stripe pero NO una entrega concurrente (race). El índice único
--      lo cierra a nivel de BD; el webhook trata la violación 23505 de este constraint como 200
--      (ver src/routes/api/stripe-webhook.ts). Parcial (where not null): los pedidos no-Stripe
--      pueden no tener session_id.
--      NOTA: `access_code` YA es UNIQUE (migración 0002 finanzas) → no se repite aquí.
--   2. activation_expires_at: columna para caducar accesos de activación. Nullable = sin caducar
--      (comportamiento actual). El enforcement (rechazar en /activar si `now > expires_at`) y la
--      política de ventana (p.ej. 1 año) son un follow-up de producto; aquí solo se prepara el esquema.
--
-- Aplicar tras 0012 en Supabase Studio (SQL Editor) o `supabase db push`.
-- Requisito: que no existan ya `stripe_session_id` duplicados (el check-then-insert lo ha evitado).

create unique index if not exists orders_stripe_session_id_key
  on orders (stripe_session_id)
  where stripe_session_id is not null;

alter table orders
  add column if not exists activation_expires_at timestamptz;

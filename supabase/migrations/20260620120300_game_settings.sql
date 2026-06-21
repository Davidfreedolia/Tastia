-- Tastia · 0012 — Config del juego: tiempos por fase + puntuación (§5.8 / FR-15)
--
-- El Admin define los tiempos por fase (default Vista 30" / Olfato 30" / Gusto 45" /
-- Gamificación 30") y los parámetros de puntuación (base 100 + Bonus de rapidez
-- hasta +50, decreciente). Configurable por pack; una fila global por defecto.
--
-- Lectura PÚBLICA: la Sala (anfitrión anónimo) necesita los tiempos para correr la
-- cuenta atrás. El reparto de puntos lo calcula el backend; exponer base/bonus no es
-- un secreto. Escritura: solo admins (FR-15: "el Jugador nunca cambia la lógica").

create table game_settings (
  id uuid primary key default gen_random_uuid(),
  pack_tier price_band,                       -- null = ajustes por defecto (global)
  time_vista_s integer not null default 30,
  time_olfato_s integer not null default 30,
  time_gusto_s integer not null default 45,
  time_gamificacion_s integer not null default 30,
  points_base integer not null default 100,
  bonus_max integer not null default 50,      -- bonus de rapidez máximo (decrece a 0)
  ranking_period text not null default 'mensual',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_game_settings_updated before update on game_settings
  for each row execute function set_updated_at();

-- Una sola fila por gama, y una sola fila global (pack_tier null).
create unique index game_settings_tier_uniq on game_settings (pack_tier) where pack_tier is not null;
create unique index game_settings_global_uniq on game_settings ((true)) where pack_tier is null;

-- Fila global por defecto (idempotente).
insert into game_settings (pack_tier)
  select null where not exists (select 1 from game_settings where pack_tier is null);

-- ========== RLS ==========
alter table game_settings enable row level security;
create policy "game_settings public read" on game_settings
  for select using (true);
create policy "admin_all_game_settings" on game_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

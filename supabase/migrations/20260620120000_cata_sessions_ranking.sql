-- Tastia · 0009 — Persistencia de sesiones de cata + ranking (§5.9 / FR-16)
--
-- Las partidas en vivo son EFÍMERAS (Realtime/presence): el estado de juego, las
-- respuestas y las fotos de los jugadores no se guardan (lo dicen §5.1/§5.2/§5.11).
-- Esta migración persiste SOLO el RESULTADO al cerrar la sesión (final_podium):
-- la partida, sus jugadores y sus puntos, más la foto del ganador. Eso alimenta el
-- ranking mensual que muestra la landing (hoy inventado).
--
-- Escritura: edge function con service_role al llegar a final_podium (los jugadores
-- son anónimos, no admins → no pueden escribir directamente). Gestión: admins.
-- Lectura del ranking: PÚBLICA vía la vista curada `ranking_mensual` (no se abren
-- las tablas internas a anon).
--
-- Aplicar tras 0008 en Supabase Studio (SQL Editor) o `supabase db push`.

-- ========== Sesión jugada (una "Sesión" del PRD: 4 vinos, un grupo, un código) ==========
create type game_session_status as enum ('in_progress', 'finished', 'abandoned');

create table game_sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null,                                       -- código de la Sala/pack (/room/:code)
  order_id uuid references orders(id) on delete set null,   -- compra asociada (si la hay; null en demo)
  pack_tier price_band,                                     -- gama jugada (basico/normal/premium)
  host_name text,                                           -- nombre del anfitrión
  wine_count integer not null default 4,
  player_count integer not null default 0,
  status game_session_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_game_sessions_updated before update on game_sessions
  for each row execute function set_updated_at();
create index game_sessions_finished_idx on game_sessions (finished_at) where status = 'finished';
create index game_sessions_order_idx on game_sessions (order_id);

-- ========== Resultado por jugador (FR-16: fecha, pack, jugadores y sus puntos) ==========
-- photo_url SOLO para el ganador (§5.11/§5.9): su foto de presence se sube al bucket
-- 'winners'; el resto de jugadores no persiste foto.
create table game_session_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  name text not null,
  points integer not null default 0,
  position integer,                                         -- puesto final (1 = ganador); null hasta el podio
  is_winner boolean not null default false,
  photo_url text,                                           -- bucket 'winners' (solo ganador)
  created_at timestamptz not null default now()
);
create index game_session_players_session_idx on game_session_players (session_id);
create index game_session_players_points_idx on game_session_players (points desc);

-- ========== RLS ==========
-- Tablas internas: las escribe el backend (edge function con service_role) y las
-- gestionan los admins. Sin política pública directa; el ranking público va por la vista.
alter table game_sessions        enable row level security;
alter table game_session_players enable row level security;

create policy "admin_all_game_sessions" on game_sessions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_all_game_session_players" on game_session_players
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ========== Storage: fotos del ganador (bucket público; escritura backend/admin) ==========
-- Público igual que 'products': se sirve por URL; un bucket público no necesita
-- política SELECT amplia. Escritura restringida a admins / service_role.
insert into storage.buckets (id, name, public) values
  ('winners', 'winners', true)
on conflict (id) do nothing;

create policy "winners insert admin" on storage.objects
  for insert to authenticated with check (bucket_id = 'winners' and public.is_admin());
create policy "winners update admin" on storage.objects
  for update to authenticated using (bucket_id = 'winners' and public.is_admin());
create policy "winners delete admin" on storage.objects
  for delete to authenticated using (bucket_id = 'winners' and public.is_admin());

-- ========== Ranking público (mensual) ==========
-- Vista curada de solo-lectura para la landing. Expone ÚNICAMENTE estas columnas
-- agregadas de sesiones terminadas, sin abrir las tablas internas a anon.
-- Nota: es una vista "definer" (no security_invoker) a propósito, para servir el
-- leaderboard público sin dar SELECT directo sobre game_session_players. El advisor
-- de Supabase la marcará como "security definer view"; es intencionado. Si se prefiere
-- evitar ese aviso, alternativa = security_invoker=on + política SELECT pública
-- limitada a status='finished' en las dos tablas.
create view ranking_mensual as
  select
    date_trunc('month', s.finished_at) as month,
    p.name,
    p.points,
    p.position,
    p.photo_url,
    s.pack_tier,
    s.id as session_id,
    s.finished_at
  from game_session_players p
  join game_sessions s on s.id = p.session_id
  where s.status = 'finished';

grant select on ranking_mensual to anon, authenticated;

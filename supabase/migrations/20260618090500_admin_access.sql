-- Tastia · 0006 — Modelo de admin + políticas RLS para el equipo
-- Solo los usuarios listados en `admins` gestionan los datos internos.

create table admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table admins enable row level security;
create policy "admins can read admin list" on admins for select to authenticated using (true);

-- Patrón estándar Supabase: helper SECURITY DEFINER para evitar recursión de RLS.
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- Acceso total para admins (equipo logueado) a las tablas internas y de catálogo.
do $$
declare t text;
begin
  foreach t in array array[
    'clients','suppliers','products','wines','tasting_notes','inventory',
    'purchases','purchase_items','supplier_invoices','orders','order_items',
    'pack_tiers','pack_tier_components','order_wines','shipping_zones',
    'avatars','game_questions','brand_assets'
  ] loop
    execute format(
      'create policy "admin_all_%1$s" on public.%1$I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t
    );
  end loop;
end $$;

-- Alta del usuario compartido del equipo como admin.
insert into admins (user_id)
select id from auth.users where email = 'hola@tastia.org'
on conflict do nothing;
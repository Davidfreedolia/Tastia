-- Tastia · 0008 — Ensamblado de pack: asigna N vinos aleatorios (de la banda de precio
-- del pack) a una orden. La llaman las edge functions (service_role) tras confirmar el pago.
-- Las notas de cata viajan solas vía wine_id (relación 1:1).

create or replace function assemble_order_pack(p_order_id uuid, p_pack_slug text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tier_id uuid;
  v_band public.price_band;
  v_count integer;
  v_inserted integer;
begin
  select id, band, wine_count into v_tier_id, v_band, v_count
  from public.pack_tiers
  where slug = p_pack_slug and active;

  if v_tier_id is null then
    raise exception 'pack tier % no encontrado o inactivo', p_pack_slug;
  end if;

  delete from public.order_wines where order_id = p_order_id;

  insert into public.order_wines (order_id, pack_tier_id, wine_id, position)
  select p_order_id, v_tier_id, w.id, row_number() over ()
  from (
    select id from public.wines
    where active and price_band = v_band
    order by random()
    limit v_count
  ) w;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

revoke execute on function public.assemble_order_pack(uuid, text) from public, anon, authenticated;
grant execute on function public.assemble_order_pack(uuid, text) to service_role;
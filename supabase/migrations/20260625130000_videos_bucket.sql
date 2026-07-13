-- Tastia · Storage: bucket público 'videos' (clips del sommelier por fase — vista /tv/$code)
-- Igual que 'products'/'winners': PÚBLICO (se sirve por URL); escritura solo admins.
-- Objetos esperados: Beronia_00..11 (ver src/lib/clip-map.ts). El bucket faltaba en el código
-- (estaba solo cableado como URL en clip-map.ts); esta migración lo hace reproducible.
-- Idempotente: se puede pegar en el SQL editor de Supabase sin miedo a re-ejecutar.

insert into storage.buckets (id, name, public) values
  ('videos', 'videos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "videos insert admin" on storage.objects;
drop policy if exists "videos update admin" on storage.objects;
drop policy if exists "videos delete admin" on storage.objects;

create policy "videos insert admin" on storage.objects
  for insert to authenticated with check (bucket_id = 'videos' and public.is_admin());
create policy "videos update admin" on storage.objects
  for update to authenticated using (bucket_id = 'videos' and public.is_admin());
create policy "videos delete admin" on storage.objects
  for delete to authenticated using (bucket_id = 'videos' and public.is_admin());

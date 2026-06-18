-- Tastia · 0007 — Storage: buckets + políticas
-- products: público (imágenes en la tienda, servidas por URL); escritura solo admins.
-- branding + tasting-notes: privados, solo admins.
-- Nota: un bucket público NO necesita política SELECT amplia (eso solo habilitaría
-- listar archivos); los objetos se sirven por su URL pública.

insert into storage.buckets (id, name, public) values
  ('products', 'products', true),
  ('branding', 'branding', false),
  ('tasting-notes', 'tasting-notes', false)
on conflict (id) do nothing;

create policy "products insert admin" on storage.objects
  for insert to authenticated with check (bucket_id = 'products' and public.is_admin());
create policy "products update admin" on storage.objects
  for update to authenticated using (bucket_id = 'products' and public.is_admin());
create policy "products delete admin" on storage.objects
  for delete to authenticated using (bucket_id = 'products' and public.is_admin());

create policy "private read admin" on storage.objects
  for select to authenticated using (bucket_id in ('branding', 'tasting-notes') and public.is_admin());
create policy "private insert admin" on storage.objects
  for insert to authenticated with check (bucket_id in ('branding', 'tasting-notes') and public.is_admin());
create policy "private update admin" on storage.objects
  for update to authenticated using (bucket_id in ('branding', 'tasting-notes') and public.is_admin());
create policy "private delete admin" on storage.objects
  for delete to authenticated using (bucket_id in ('branding', 'tasting-notes') and public.is_admin());
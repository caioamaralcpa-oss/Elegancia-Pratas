-- Exclusão explícita e auditada de uma joia sem histórico de pedidos.
-- Fotos só são devolvidas para limpeza se não forem usadas por outras peças.
create or replace function public.delete_jewelry(p_product_id uuid)
returns table(registration_code text, identification_image_path text, commercial_image_paths text[])
language plpgsql security definer set search_path = '' as $$
declare
  v_product public.products%rowtype;
  v_private_path text;
  v_public_paths text[];
  v_prefix constant text := 'https://sltohhqejguauhanjhfj.supabase.co/storage/v1/object/public/product-images/';
begin
  if not public.has_staff_role(array['administrador']) then raise exception 'Acesso negado'; end if;
  select * into v_product from public.products p where p.id = p_product_id for update;
  if not found or not exists (select 1 from public.jewelry_intake j where j.product_id = p_product_id) then
    raise exception 'Joia não encontrada';
  end if;
  if exists (select 1 from public.order_items oi where oi.product_id = p_product_id
    or oi.variant_id in (select pv.id from public.product_variants pv where pv.product_id = p_product_id)) then
    raise exception 'Esta joia possui histórico de pedidos e não pode ser excluída';
  end if;

  select j.identification_image_path into v_private_path from public.jewelry_intake j where j.product_id = p_product_id;
  delete from public.products p where p.id = p_product_id;

  if exists (select 1 from public.jewelry_intake j where j.identification_image_path = v_private_path) then
    v_private_path := null;
  end if;
  select coalesce(array_agg(distinct substring(photo.url from length(v_prefix) + 1)), array[]::text[])
    into v_public_paths
  from unnest(v_product.commercial_image_urls) as photo(url)
  where left(photo.url, length(v_prefix)) = v_prefix
    and not exists (select 1 from public.products other
      where photo.url = other.image_url or photo.url = any(other.commercial_image_urls));

  return query select v_product.registration_code, v_private_path, v_public_paths;
end;
$$;
revoke all on function public.delete_jewelry(uuid) from public, anon;
grant execute on function public.delete_jewelry(uuid) to authenticated;

create policy "admin delete identification photos with mfa" on storage.objects
  for delete to authenticated using (bucket_id = 'jewelry-identification' and public.has_staff_role(array['administrador']));

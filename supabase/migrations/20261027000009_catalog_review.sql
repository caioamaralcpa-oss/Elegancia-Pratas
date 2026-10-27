-- A revisão comercial é atômica: somente o administrador com MFA pode publicar.
alter table public.products add column if not exists commercial_image_urls text[] not null default '{}';

create or replace function public.save_catalog_review(
  p_product_id uuid, p_name text, p_description text, p_measurements text,
  p_image_urls text[], p_publish boolean
) returns table(id uuid, active boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_product public.products%rowtype;
  v_url text;
  v_path text;
  v_prefix constant text := 'https://sltohhqejguauhanjhfj.supabase.co/storage/v1/object/public/product-images/';
begin
  if not public.has_staff_role(array['administrador']) then raise exception 'Acesso negado'; end if;
  select * into v_product from public.products where products.id = p_product_id for update;
  if not found or v_product.workflow_stage not in ('aguardando_catalogo', 'pronto')
     or v_product.price_cents <= 0 or not exists (
       select 1 from public.jewelry_intake j where j.product_id = p_product_id
     ) then raise exception 'Joia não está pronta para revisão comercial'; end if;
  if nullif(trim(p_name), '') is null or length(trim(p_name)) > 120
     or length(coalesce(p_description, '')) > 2000
     or length(coalesce(p_measurements, '')) > 240 then
    raise exception 'Confira os campos da ficha comercial';
  end if;
  if p_image_urls is null or cardinality(p_image_urls) > 8
     or (select count(distinct u) from unnest(p_image_urls) u) <> cardinality(p_image_urls) then
    raise exception 'Escolha até 8 fotos comerciais diferentes';
  end if;
  foreach v_url in array p_image_urls loop
    if v_url is null or left(v_url, length(v_prefix)) <> v_prefix then
      raise exception 'Foto comercial inválida';
    end if;
    v_path := substring(v_url from length(v_prefix) + 1);
    if v_path !~ '^[0-9a-f-]{36}\.webp$' or not exists (
      select 1 from storage.objects o where o.bucket_id = 'product-images' and o.name = v_path
    ) then raise exception 'Foto comercial não encontrada'; end if;
  end loop;
  if coalesce(p_publish, v_product.active) and (nullif(trim(p_description), '') is null
     or nullif(trim(p_measurements), '') is null or cardinality(p_image_urls) = 0) then
    raise exception 'Nome, descrição, medidas e foto são obrigatórios para publicar';
  end if;
  perform set_config('app.catalog_review', 'allowed', true);
  update public.products set name = trim(p_name), description = nullif(trim(p_description), ''),
    measurements = nullif(trim(p_measurements), ''), commercial_image_urls = p_image_urls,
    image_url = p_image_urls[1], workflow_stage = case when coalesce(p_publish, v_product.active) then 'pronto' else 'aguardando_catalogo' end,
    active = coalesce(p_publish, v_product.active) where products.id = p_product_id;
  perform set_config('app.catalog_review', '', true);
  return query select products.id, products.active from public.products where products.id = p_product_id;
end;
$$;
revoke all on function public.save_catalog_review(uuid,text,text,text,text[],boolean) from public, anon;
grant execute on function public.save_catalog_review(uuid,text,text,text,text[],boolean) to authenticated;

-- Bloqueia atalhos via atualização direta da tabela, inclusive pelo administrador.
create or replace function public.guard_catalog_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (
    new.active is distinct from old.active or new.commercial_image_urls is distinct from old.commercial_image_urls
    or new.image_url is distinct from old.image_url
  ) and coalesce(current_setting('app.catalog_review', true), '') <> 'allowed' then
    raise exception 'Use a revisão do Catálogo para alterar fotos ou publicação';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_catalog_update() from public, anon, authenticated;
drop trigger if exists guard_catalog_update on public.products;
create trigger guard_catalog_update before update on public.products
  for each row execute function public.guard_catalog_update();

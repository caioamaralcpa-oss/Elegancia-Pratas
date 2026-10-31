-- A coleção passa a ser uma etapa obrigatória entre o cadastro e o preço.
create or replace function public.require_collection_for_pricing()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.products where id = new.product_id and collection_id is not null) then
    raise exception 'Defina a coleção da joia antes de precificar';
  end if;
  return new;
end;
$$;
revoke all on function public.require_collection_for_pricing() from public, anon, authenticated;
create trigger require_collection_for_pricing before insert or update on public.product_pricing
  for each row execute function public.require_collection_for_pricing();

create or replace function public.set_jewelry_collection(p_product_id uuid, p_collection_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_staff_role(array['administrador']) then raise exception 'Acesso negado'; end if;
  if p_collection_id is not null and not exists (select 1 from public.collections where id = p_collection_id) then
    raise exception 'Coleção inválida';
  end if;
  if p_collection_id is null and exists (
    select 1 from public.products where id = p_product_id and workflow_stage <> 'aguardando_precificacao'
  ) then
    raise exception 'Joia precificada deve permanecer em uma coleção';
  end if;
  update public.products set collection_id = p_collection_id where id = p_product_id;
  if not found then raise exception 'Joia inexistente'; end if;
end;
$$;
revoke all on function public.set_jewelry_collection(uuid,uuid) from public, anon;
grant execute on function public.set_jewelry_collection(uuid,uuid) to authenticated;

create or replace function public.assign_jewelry_collection(p_product_ids uuid[], p_collection_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if not public.has_staff_role(array['administrador']) then raise exception 'Acesso negado'; end if;
  if p_collection_id is null or not exists (select 1 from public.collections where id = p_collection_id) then
    raise exception 'Selecione uma coleção válida';
  end if;
  if p_product_ids is null or cardinality(p_product_ids) < 1 or cardinality(p_product_ids) > 500
     or cardinality(p_product_ids) <> (select count(distinct selected.product_id) from unnest(p_product_ids) as selected(product_id))
     or array_position(p_product_ids, null) is not null then
    raise exception 'Selecione de 1 a 500 joias sem repetições';
  end if;
  update public.products set collection_id = p_collection_id where id = any(p_product_ids);
  get diagnostics v_count = row_count;
  if v_count <> cardinality(p_product_ids) then raise exception 'Uma ou mais joias não foram encontradas'; end if;
  return v_count;
end;
$$;
revoke all on function public.assign_jewelry_collection(uuid[],uuid) from public, anon;
grant execute on function public.assign_jewelry_collection(uuid[],uuid) to authenticated;

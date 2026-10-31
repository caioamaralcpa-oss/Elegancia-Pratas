-- Coleções são agrupamentos comerciais; cada joia pertence a no máximo uma.
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 100),
  created_at timestamptz not null default now()
);
create unique index collections_name_unique on public.collections (lower(trim(name)));
alter table public.products add column collection_id uuid references public.collections(id) on delete set null;
create index products_collection_id_idx on public.products(collection_id);
alter table public.collections enable row level security;
revoke all on public.collections from anon, authenticated;
grant select on public.collections to anon;
grant select, insert, update on public.collections to authenticated;
create policy "public read collections used by active products" on public.collections
  for select to anon, authenticated using (
    exists (select 1 from public.products p where p.collection_id = collections.id and p.active)
  );
create policy "admin read all collections with mfa" on public.collections
  for select to authenticated using (public.has_staff_role(array['administrador']));
create policy "admin create collections with mfa" on public.collections
  for insert to authenticated with check (public.has_staff_role(array['administrador']));
create policy "admin update collections with mfa" on public.collections
  for update to authenticated using (public.has_staff_role(array['administrador']))
  with check (public.has_staff_role(array['administrador']));

create or replace function public.set_jewelry_collection(p_product_id uuid, p_collection_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_staff_role(array['administrador']) then raise exception 'Acesso negado'; end if;
  if p_collection_id is not null and not exists (select 1 from public.collections where id = p_collection_id) then
    raise exception 'Coleção inválida';
  end if;
  update public.products set collection_id = p_collection_id where id = p_product_id;
  if not found then raise exception 'Joia inexistente'; end if;
end;
$$;
revoke all on function public.set_jewelry_collection(uuid,uuid) from public, anon;
grant execute on function public.set_jewelry_collection(uuid,uuid) to authenticated;

create or replace function public.save_jewelry_intake_v3(
  p_id uuid, p_name text, p_description text, p_model text, p_measurements text,
  p_quantity integer, p_unit_cost_cents integer, p_identification_image_path text,
  p_gender text, p_collection_id uuid
)
returns table(id uuid, registration_code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.has_staff_role(array['administrador']) then raise exception 'Acesso negado'; end if;
  select saved.id into v_id from public.save_jewelry_intake_v2(
    p_id, p_name, p_description, p_model, p_measurements,
    p_quantity, p_unit_cost_cents, p_identification_image_path, p_gender
  ) as saved;
  perform public.set_jewelry_collection(v_id, p_collection_id);
  return query select products.id, products.registration_code from public.products where products.id = v_id;
end;
$$;
revoke all on function public.save_jewelry_intake_v3(uuid,text,text,text,text,integer,integer,text,text,uuid) from public, anon;
grant execute on function public.save_jewelry_intake_v3(uuid,text,text,text,text,integer,integer,text,text,uuid) to authenticated;

create trigger audit_collections after insert or update or delete on public.collections
  for each row execute function public.log_admin_change();

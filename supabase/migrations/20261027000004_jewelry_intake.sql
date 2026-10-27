-- Etapa 1: cadastro privado da joia, separado do catálogo público.
create sequence if not exists public.jewelry_registration_seq;

alter table public.products
  add column if not exists registration_code text,
  add column if not exists model text,
  add column if not exists measurements text,
  add column if not exists workflow_stage text not null default 'aguardando_precificacao';

alter table public.products add constraint products_workflow_stage_check
  check (workflow_stage in ('aguardando_precificacao', 'aguardando_catalogo', 'pronto'));

create or replace function public.guard_jewelry_registration()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.registration_code is null then
    new.registration_code := 'EJ-' || lpad(nextval('public.jewelry_registration_seq')::text, 6, '0');
  elsif tg_op = 'UPDATE' and new.registration_code is distinct from old.registration_code then
    raise exception 'O código da joia não pode ser alterado';
  end if;
  if new.active and (new.workflow_stage <> 'pronto' or new.price_cents <= 0
     or nullif(trim(new.description), '') is null
     or nullif(trim(new.measurements), '') is null
     or nullif(trim(new.image_url), '') is null) then
    raise exception 'Conclua precificação, catálogo e foto comercial antes de publicar';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_jewelry_registration() from public, anon, authenticated;
update public.products set registration_code = 'EJ-' || lpad(nextval('public.jewelry_registration_seq')::text, 6, '0')
  where registration_code is null;
update public.products set workflow_stage = 'pronto' where active;
alter table public.products alter column registration_code set not null;
create unique index products_registration_code_unique on public.products(registration_code);
create trigger guard_jewelry_registration before insert or update on public.products
  for each row execute function public.guard_jewelry_registration();

create table public.jewelry_intake (
  product_id uuid primary key references public.products(id) on delete cascade,
  acquisition_cost_cents integer not null default 0 check (acquisition_cost_cents >= 0),
  identification_image_path text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.jewelry_intake enable row level security;
revoke all on public.jewelry_intake from anon, authenticated;
grant select, insert, update on public.jewelry_intake to authenticated;
create policy "admin read jewelry intake with mfa" on public.jewelry_intake
  for select to authenticated using (public.has_staff_role(array['administrador']));
create policy "admin insert jewelry intake with mfa" on public.jewelry_intake
  for insert to authenticated with check (public.has_staff_role(array['administrador']));
create policy "admin update jewelry intake with mfa" on public.jewelry_intake
  for update to authenticated using (public.has_staff_role(array['administrador']))
  with check (public.has_staff_role(array['administrador']));

create or replace function public.log_jewelry_intake_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.admin_audit_log(actor_id, action, table_name, row_id)
  values ((select auth.uid()), tg_op, 'jewelry_intake', new.product_id);
  return new;
end;
$$;
revoke all on function public.log_jewelry_intake_change() from public, anon, authenticated;
create trigger audit_jewelry_intake after insert or update on public.jewelry_intake
  for each row execute function public.log_jewelry_intake_change();

create or replace function public.save_jewelry_intake(
  p_id uuid, p_name text, p_description text, p_model text, p_measurements text,
  p_quantity integer, p_unit_cost_cents integer, p_identification_image_path text
)
returns table(id uuid, registration_code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.has_staff_role(array['administrador']) then raise exception 'Acesso negado'; end if;
  if nullif(trim(p_name), '') is null or nullif(trim(p_model), '') is null
     or p_quantity is null or p_quantity < 0 or p_quantity > 1000000
     or p_unit_cost_cents is null or p_unit_cost_cents < 0 then
    raise exception 'Dados da joia inválidos';
  end if;
  if p_id is null then
    v_id := gen_random_uuid();
    insert into public.products(id, slug, name, description, category, model, measurements, price_cents, stock, active)
    values (v_id, 'joia-' || replace(v_id::text, '-', ''), trim(p_name), nullif(trim(p_description), ''),
      trim(p_model), trim(p_model), nullif(trim(p_measurements), ''), 0, p_quantity, false);
    insert into public.jewelry_intake(product_id, acquisition_cost_cents, identification_image_path, updated_by)
    values (v_id, p_unit_cost_cents, p_identification_image_path, (select auth.uid()));
  else
    update public.products set name = trim(p_name), description = nullif(trim(p_description), ''),
      category = trim(p_model), model = trim(p_model), measurements = nullif(trim(p_measurements), ''),
      stock = p_quantity where products.id = p_id and active = false;
    if not found then raise exception 'Joia inexistente ou publicada'; end if;
    insert into public.jewelry_intake(product_id, acquisition_cost_cents, identification_image_path, updated_by)
    values (p_id, p_unit_cost_cents, p_identification_image_path, (select auth.uid()))
    on conflict (product_id) do update set acquisition_cost_cents = excluded.acquisition_cost_cents,
      identification_image_path = coalesce(excluded.identification_image_path, jewelry_intake.identification_image_path),
      updated_at = now(), updated_by = excluded.updated_by;
    v_id := p_id;
  end if;
  return query select products.id, products.registration_code from public.products where products.id = v_id;
end;
$$;
revoke all on function public.save_jewelry_intake(uuid,text,text,text,text,integer,integer,text) from public, anon;
grant execute on function public.save_jewelry_intake(uuid,text,text,text,text,integer,integer,text) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('jewelry-identification', 'jewelry-identification', false, 5242880, array['image/webp'])
on conflict (id) do nothing;
create policy "admin read identification photos with mfa" on storage.objects
  for select to authenticated using (bucket_id = 'jewelry-identification' and public.has_staff_role(array['administrador']));
create policy "admin upload identification photos with mfa" on storage.objects
  for insert to authenticated with check (bucket_id = 'jewelry-identification' and public.has_staff_role(array['administrador']));

-- Estoque privado: embalagens consumíveis, lotes de equipamentos e modelos.
create table public.stock_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('embalagem', 'insumo')),
  name text not null check (length(trim(name)) between 1 and 120),
  unit_cost_cents integer not null check (unit_cost_cents >= 0),
  quantity_on_hand integer not null default 0 check (quantity_on_hand between 0 and 1000000),
  acquired_quantity integer not null default 0 check (acquired_quantity between 0 and 1000000),
  acquired_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint durable_asset_acquisition_date check (kind = 'embalagem' or acquired_on is not null)
);
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.stock_items(id) on delete restrict,
  delta integer not null check (delta <> 0),
  balance_after integer not null check (balance_after >= 0),
  reason text not null check (length(trim(reason)) between 1 and 200),
  actor_id uuid,
  created_at timestamptz not null default now()
);
create index stock_movements_item_date on public.stock_movements(item_id, created_at desc);

create table public.packaging_models (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 120),
  channel text not null check (channel in ('local', 'envio')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.packaging_model_components (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.packaging_models(id) on delete cascade,
  item_id uuid not null references public.stock_items(id) on delete restrict,
  quantity integer not null check (quantity between 1 and 1000),
  unique(model_id, item_id)
);

alter table public.stock_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.packaging_models enable row level security;
alter table public.packaging_model_components enable row level security;
revoke all on public.stock_items, public.stock_movements, public.packaging_models, public.packaging_model_components from public, anon, authenticated;
grant select on public.stock_items, public.stock_movements, public.packaging_models, public.packaging_model_components to authenticated;
create policy "admin read stock items with mfa" on public.stock_items for select to authenticated
  using (public.has_staff_role(array['administrador']));
create policy "admin read stock movements with mfa" on public.stock_movements for select to authenticated
  using (public.has_staff_role(array['administrador']));
create policy "admin read packaging models with mfa" on public.packaging_models for select to authenticated
  using (public.has_staff_role(array['administrador']));
create policy "admin read packaging components with mfa" on public.packaging_model_components for select to authenticated
  using (public.has_staff_role(array['administrador']));

create trigger audit_stock_items after insert or update or delete on public.stock_items
  for each row execute function public.log_admin_change();
create trigger audit_stock_movements after insert on public.stock_movements
  for each row execute function public.log_admin_change();
create trigger audit_packaging_models after insert or update or delete on public.packaging_models
  for each row execute function public.log_admin_change();
create trigger audit_packaging_components after insert or update or delete on public.packaging_model_components
  for each row execute function public.log_admin_change();

create or replace function public.save_stock_item(
  p_id uuid, p_kind text, p_name text, p_unit_cost_cents integer,
  p_initial_quantity integer, p_acquired_on date
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.has_staff_role(array['administrador']) then raise exception 'Acesso negado'; end if;
  if p_kind not in ('embalagem', 'insumo') or nullif(trim(p_name), '') is null
    or length(trim(p_name)) > 120 or p_unit_cost_cents is null or p_unit_cost_cents < 0
    or p_initial_quantity is null or p_initial_quantity < 0 or p_initial_quantity > 1000000
    or (p_kind = 'insumo' and (p_acquired_on is null or p_acquired_on > current_date)) then
    raise exception 'Dados do item inválidos';
  end if;
  if p_id is null then
    insert into public.stock_items(kind, name, unit_cost_cents, quantity_on_hand, acquired_quantity, acquired_on)
    values (p_kind, trim(p_name), p_unit_cost_cents, p_initial_quantity,
      case when p_kind = 'insumo' then p_initial_quantity else 0 end,
      case when p_kind = 'insumo' then p_acquired_on else null end)
    returning id into v_id;
    if p_initial_quantity > 0 then
      insert into public.stock_movements(item_id, delta, balance_after, reason, actor_id)
      values (v_id, p_initial_quantity, p_initial_quantity, 'Saldo inicial', (select auth.uid()));
    end if;
  else
    update public.stock_items set name = trim(p_name), unit_cost_cents = p_unit_cost_cents,
      acquired_on = case when p_kind = 'insumo' then p_acquired_on else null end, updated_at = now()
    where id = p_id and kind = p_kind returning id into v_id;
    if v_id is null then raise exception 'Item não encontrado ou tipo incompatível'; end if;
  end if;
  return v_id;
end;
$$;
revoke all on function public.save_stock_item(uuid,text,text,integer,integer,date) from public, anon;
grant execute on function public.save_stock_item(uuid,text,text,integer,integer,date) to authenticated;

create or replace function public.adjust_stock_item(p_id uuid, p_delta integer, p_reason text)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_item public.stock_items%rowtype; v_balance integer;
begin
  if not public.has_staff_role(array['administrador']) then raise exception 'Acesso negado'; end if;
  if p_delta is null or p_delta = 0 or abs(p_delta::bigint) > 1000000
     or nullif(trim(p_reason), '') is null or length(trim(p_reason)) > 200 then
    raise exception 'Ajuste inválido';
  end if;
  select * into v_item from public.stock_items where id = p_id for update;
  if not found then raise exception 'Item não encontrado'; end if;
  if v_item.kind = 'insumo' and p_delta > 0 then
    raise exception 'Registre uma nova compra de equipamento como outro lote';
  end if;
  v_balance := v_item.quantity_on_hand + p_delta;
  if v_balance < 0 or v_balance > 1000000 then raise exception 'Saldo insuficiente ou acima do limite'; end if;
  update public.stock_items set quantity_on_hand = v_balance, updated_at = now() where id = p_id;
  insert into public.stock_movements(item_id, delta, balance_after, reason, actor_id)
  values (p_id, p_delta, v_balance, trim(p_reason), (select auth.uid()));
  return v_balance;
end;
$$;
revoke all on function public.adjust_stock_item(uuid,integer,text) from public, anon;
grant execute on function public.adjust_stock_item(uuid,integer,text) to authenticated;

create or replace function public.save_packaging_model(
  p_id uuid, p_name text, p_channel text, p_components jsonb
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_component record;
begin
  if not public.has_staff_role(array['administrador']) then raise exception 'Acesso negado'; end if;
  if nullif(trim(p_name), '') is null or length(trim(p_name)) > 120
    or p_channel not in ('local', 'envio') or p_components is null
    or jsonb_typeof(p_components) <> 'array' or jsonb_array_length(p_components) not between 1 and 50 then
    raise exception 'Modelo inválido';
  end if;
  if p_id is null then
    insert into public.packaging_models(name, channel) values (trim(p_name), p_channel) returning id into v_id;
  else
    update public.packaging_models set name = trim(p_name), channel = p_channel, updated_at = now()
      where id = p_id returning id into v_id;
    if v_id is null then raise exception 'Modelo não encontrado'; end if;
    delete from public.packaging_model_components where model_id = v_id;
  end if;
  for v_component in select * from jsonb_to_recordset(p_components) as x(item_id uuid, quantity integer) loop
    if v_component.item_id is null or v_component.quantity is null
      or v_component.quantity not between 1 and 1000
      or not exists (select 1 from public.stock_items where id = v_component.item_id and kind = 'embalagem') then
      raise exception 'Componente de embalagem inválido';
    end if;
    insert into public.packaging_model_components(model_id, item_id, quantity)
      values (v_id, v_component.item_id, v_component.quantity);
  end loop;
  return v_id;
end;
$$;
revoke all on function public.save_packaging_model(uuid,text,text,jsonb) from public, anon;
grant execute on function public.save_packaging_model(uuid,text,text,jsonb) to authenticated;

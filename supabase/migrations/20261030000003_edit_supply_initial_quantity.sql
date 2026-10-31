-- Recupera a quantidade inicial dos lotes antigos sem alterar o saldo atual.
update public.stock_items s set initial_quantity = acquired_quantity
where s.kind = 'insumo' and s.initial_quantity = 0 and s.acquired_quantity > 0
  and not exists (
    select 1 from public.stock_movements m where m.item_id = s.id
      and m.reason like 'Correção da quantidade inicial do insumo:%'
  );

-- Este RPC fica reservado a insumos. Embalagens usam save_packaging_item,
-- que recebe custo total em vez de custo unitário.
create or replace function public.save_stock_item(
  p_id uuid, p_kind text, p_name text, p_unit_cost_cents integer,
  p_initial_quantity integer, p_acquired_on date
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_item public.stock_items%rowtype;
  v_delta integer;
  v_balance integer;
begin
  if not public.has_staff_role(array['administrador']) then raise exception 'Acesso negado'; end if;
  if p_kind is distinct from 'insumo' or nullif(trim(p_name), '') is null
    or length(trim(p_name)) > 120 or p_unit_cost_cents is null or p_unit_cost_cents < 0
    or p_initial_quantity is null or p_initial_quantity not between 0 and 1000000
    or p_acquired_on is null or p_acquired_on > current_date then
    raise exception 'Dados do insumo inválidos';
  end if;

  if p_id is null then
    insert into public.stock_items(kind, name, unit_cost_cents, quantity_on_hand,
      initial_quantity, acquired_quantity, acquired_on)
    values ('insumo', trim(p_name), p_unit_cost_cents, p_initial_quantity,
      p_initial_quantity, p_initial_quantity, p_acquired_on)
    returning id into v_id;
    if p_initial_quantity > 0 then
      insert into public.stock_movements(item_id, delta, balance_after, reason, actor_id)
      values (v_id, p_initial_quantity, p_initial_quantity, 'Saldo inicial', (select auth.uid()));
    end if;
  else
    select * into v_item from public.stock_items where id = p_id for update;
    if not found or v_item.kind <> 'insumo' then raise exception 'Insumo não encontrado'; end if;
    v_id := v_item.id;
    v_delta := p_initial_quantity - v_item.initial_quantity;
    v_balance := v_item.quantity_on_hand + v_delta;
    if v_balance not between 0 and 1000000 then
      raise exception 'A correção da quantidade inicial deixaria o saldo fora do limite';
    end if;
    update public.stock_items set name = trim(p_name), unit_cost_cents = p_unit_cost_cents,
      initial_quantity = p_initial_quantity, acquired_quantity = p_initial_quantity,
      quantity_on_hand = v_balance, acquired_on = p_acquired_on,
      updated_at = now() where id = v_id;
    if v_delta <> 0 then
      insert into public.stock_movements(item_id, delta, balance_after, reason, actor_id)
      values (v_id, v_delta, v_balance,
        'Correção da quantidade inicial do insumo: ' || v_item.initial_quantity || ' → ' || p_initial_quantity,
        (select auth.uid()));
    end if;
  end if;
  return v_id;
end;
$$;

revoke all on function public.save_stock_item(uuid,text,text,integer,integer,date) from public, anon;
grant execute on function public.save_stock_item(uuid,text,text,integer,integer,date) to authenticated;

-- Os valores antigos de embalagens foram informados como custo total da compra.
-- Converte uma única vez, preservando o total exato e calculando o custo por unidade.
alter table public.stock_items add column if not exists purchase_total_cents integer
  check (purchase_total_cents >= 0);

update public.stock_items set
  purchase_total_cents = unit_cost_cents,
  unit_cost_cents = round(unit_cost_cents::numeric / initial_quantity)::integer,
  updated_at = now()
where kind = 'embalagem' and purchase_total_cents is null and initial_quantity > 0;

create or replace function public.save_packaging_item(
  p_id uuid, p_name text, p_total_cost_cents integer, p_initial_quantity integer
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_item public.stock_items%rowtype;
  v_unit_cost integer;
  v_delta integer;
  v_balance integer;
begin
  if not public.has_staff_role(array['administrador']) then raise exception 'Acesso negado'; end if;
  if nullif(trim(p_name), '') is null or length(trim(p_name)) > 120
    or p_total_cost_cents is null or p_total_cost_cents < 0 or p_total_cost_cents > 2147483647
    or p_initial_quantity is null or p_initial_quantity not between 1 and 1000000 then
    raise exception 'Nome, custo total ou quantidade inválidos';
  end if;
  v_unit_cost := round(p_total_cost_cents::numeric / p_initial_quantity)::integer;

  if p_id is null then
    insert into public.stock_items(kind, name, unit_cost_cents, purchase_total_cents,
      quantity_on_hand, initial_quantity, acquired_quantity)
    values ('embalagem', trim(p_name), v_unit_cost, p_total_cost_cents,
      p_initial_quantity, p_initial_quantity, 0) returning id into v_id;
    insert into public.stock_movements(item_id, delta, balance_after, reason, actor_id)
    values (v_id, p_initial_quantity, p_initial_quantity, 'Saldo inicial', (select auth.uid()));
  else
    select * into v_item from public.stock_items where id = p_id for update;
    if not found or v_item.kind <> 'embalagem' then raise exception 'Embalagem não encontrada'; end if;
    v_id := v_item.id;
    v_delta := p_initial_quantity - v_item.initial_quantity;
    v_balance := v_item.quantity_on_hand + v_delta;
    if v_balance not between 0 and 1000000 then
      raise exception 'A correção da quantidade inicial deixaria o saldo fora do limite';
    end if;
    update public.stock_items set name = trim(p_name), unit_cost_cents = v_unit_cost,
      purchase_total_cents = p_total_cost_cents, initial_quantity = p_initial_quantity,
      quantity_on_hand = v_balance, updated_at = now() where id = v_id;
    if v_delta <> 0 then
      insert into public.stock_movements(item_id, delta, balance_after, reason, actor_id)
      values (v_id, v_delta, v_balance,
        'Correção da quantidade inicial: ' || v_item.initial_quantity || ' → ' || p_initial_quantity,
        (select auth.uid()));
    end if;
  end if;
  return v_id;
end;
$$;

revoke all on function public.save_packaging_item(uuid,text,integer,integer) from public, anon;
grant execute on function public.save_packaging_item(uuid,text,integer,integer) to authenticated;

-- Uma peça só avança de etapa quando há uma ficha de preço aprovada para ela.
create or replace function public.guard_jewelry_registration()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.registration_code is null then
    new.registration_code := 'EJ-' || lpad(nextval('public.jewelry_registration_seq')::text, 6, '0');
  elsif tg_op = 'UPDATE' and new.registration_code is distinct from old.registration_code then
    raise exception 'O código da joia não pode ser alterado';
  end if;
  if new.workflow_stage <> 'aguardando_precificacao' and not exists (
    select 1 from public.product_pricing p where p.product_id = new.id
      and p.approved_price_cents = new.price_cents and p.approved_price_cents > 0
      and p.packaging_model_id is not null
  ) then
    raise exception 'A joia precisa de uma precificação aprovada antes de avançar';
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

-- Se o custo de compra mudar, a peça volta à fila de preços, mas preserva a
-- ficha anterior para revisão. Peças publicadas não são editadas em Joias.
create or replace function public.invalidate_jewelry_price_on_cost_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.acquisition_cost_cents is distinct from old.acquisition_cost_cents then
    update public.products set workflow_stage = 'aguardando_precificacao', price_cents = 0
      where id = new.product_id and active = false;
  end if;
  return new;
end;
$$;
revoke all on function public.invalidate_jewelry_price_on_cost_change() from public, anon, authenticated;
create trigger invalidate_jewelry_price after update of acquisition_cost_cents on public.jewelry_intake
  for each row execute function public.invalidate_jewelry_price_on_cost_change();

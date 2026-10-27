-- Custos internos da joia nunca são expostos ao catálogo público.
create table public.product_pricing (
  product_id uuid primary key references public.products(id) on delete cascade,
  acquisition_cost_cents integer not null default 0 check (acquisition_cost_cents >= 0),
  packaging_cost_cents integer not null default 0 check (packaging_cost_cents >= 0),
  labor_cost_cents integer not null default 0 check (labor_cost_cents >= 0),
  shipping_subsidy_cents integer not null default 0 check (shipping_subsidy_cents >= 0),
  other_cost_cents integer not null default 0 check (other_cost_cents >= 0),
  payment_fee_bps integer not null default 0 check (payment_fee_bps between 0 and 9999),
  tax_bps integer not null default 0 check (tax_bps between 0 and 9999),
  overhead_bps integer not null default 0 check (overhead_bps between 0 and 9999),
  target_margin_bps integer not null default 0 check (target_margin_bps between 0 and 9999),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint rate_sum_below_100_percent check (payment_fee_bps + tax_bps + overhead_bps + target_margin_bps < 10000)
);

alter table public.product_pricing enable row level security;
revoke all on public.product_pricing from anon;
revoke all on public.product_pricing from authenticated;
grant select, insert, update on public.product_pricing to authenticated;

create policy "admin read pricing with mfa" on public.product_pricing
  for select to authenticated using (public.has_staff_role(array['administrador']));
create policy "admin insert pricing with mfa" on public.product_pricing
  for insert to authenticated with check (public.has_staff_role(array['administrador']));
create policy "admin update pricing with mfa" on public.product_pricing
  for update to authenticated using (public.has_staff_role(array['administrador']))
  with check (public.has_staff_role(array['administrador']));

create or replace function public.set_pricing_metadata()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end;
$$;
revoke all on function public.set_pricing_metadata() from public;
create trigger pricing_metadata before insert or update on public.product_pricing
  for each row execute function public.set_pricing_metadata();

create or replace function public.log_pricing_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.admin_audit_log(actor_id, action, table_name, row_id)
  values ((select auth.uid()), tg_op, 'product_pricing', new.product_id);
  return new;
end;
$$;
revoke all on function public.log_pricing_change() from public;
create trigger audit_pricing after insert or update on public.product_pricing
  for each row execute function public.log_pricing_change();

-- Aplica somente um preço calculado a partir da ficha salva, após ação explícita.
create or replace function public.apply_suggested_price(p_product_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  quote public.product_pricing%rowtype;
  fixed_cost numeric;
  rate_total integer;
  suggested numeric;
begin
  if not public.has_staff_role(array['administrador']) then
    raise exception 'Acesso negado';
  end if;
  select * into quote from public.product_pricing where product_id = p_product_id for update;
  if not found then raise exception 'Ficha de custos inexistente'; end if;
  fixed_cost := quote.acquisition_cost_cents::numeric + quote.packaging_cost_cents + quote.labor_cost_cents
    + quote.shipping_subsidy_cents + quote.other_cost_cents;
  if fixed_cost <= 0 then raise exception 'Informe custos antes de aplicar o preço'; end if;
  rate_total := quote.payment_fee_bps + quote.tax_bps + quote.overhead_bps + quote.target_margin_bps;
  suggested := ceil((fixed_cost * 10000) / (10000 - rate_total));
  if suggested > 2147483647 then raise exception 'Preço calculado fora do limite'; end if;
  update public.products set price_cents = suggested::integer where id = p_product_id;
  if not found then raise exception 'Produto inexistente'; end if;
  return suggested::integer;
end;
$$;
revoke all on function public.apply_suggested_price(uuid) from public;
revoke all on function public.apply_suggested_price(uuid) from anon;
grant execute on function public.apply_suggested_price(uuid) to authenticated;

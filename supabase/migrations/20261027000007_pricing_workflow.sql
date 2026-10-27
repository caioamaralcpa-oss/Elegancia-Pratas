-- Precificação ligada ao cadastro de joias e ao estoque. Valores usados são
-- fotografados na ficha, preservando o histórico mesmo se custos mudarem.
alter table public.product_pricing
  add column packaging_model_id uuid references public.packaging_models(id) on delete restrict,
  add column depreciation_cost_cents integer not null default 0 check (depreciation_cost_cents >= 0),
  add column monthly_depreciation_cents integer not null default 0 check (monthly_depreciation_cents >= 0),
  add column monthly_sales_estimate integer not null default 1 check (monthly_sales_estimate between 1 and 1000000),
  add column pricing_mode text not null default 'margem' check (pricing_mode in ('margem', 'preco')),
  add column approved_price_cents integer not null default 0 check (approved_price_cents >= 0),
  add column estimated_margin_bps bigint not null default 0;

-- Não permitir que a ficha seja alterada diretamente pelo navegador.
revoke insert, update on public.product_pricing from authenticated;
revoke execute on function public.apply_suggested_price(uuid) from authenticated;

create or replace function public.save_jewelry_pricing(
  p_product_id uuid, p_packaging_model_id uuid, p_monthly_sales_estimate integer,
  p_labor_cost_cents integer, p_shipping_subsidy_cents integer, p_other_cost_cents integer,
  p_payment_fee_bps integer, p_tax_bps integer, p_overhead_bps integer,
  p_target_margin_bps integer, p_manual_price_cents integer
)
returns table(price_cents integer, estimated_margin_bps bigint, fixed_cost_cents integer)
language plpgsql security definer set search_path = '' as $$
declare
  v_product public.products%rowtype;
  v_acquisition integer;
  v_packaging numeric;
  v_monthly_depreciation numeric;
  v_depreciation_per_piece numeric;
  v_fixed numeric;
  v_variable_bps integer;
  v_price numeric;
  v_target_bps integer;
  v_margin numeric;
  v_mode text;
begin
  if not public.has_staff_role(array['administrador']) then raise exception 'Acesso negado'; end if;
  if p_monthly_sales_estimate is null or p_monthly_sales_estimate not between 1 and 1000000
    or p_labor_cost_cents is null or p_labor_cost_cents < 0
    or p_shipping_subsidy_cents is null or p_shipping_subsidy_cents < 0
    or p_other_cost_cents is null or p_other_cost_cents < 0
    or p_payment_fee_bps is null or p_payment_fee_bps not between 0 and 9999
    or p_tax_bps is null or p_tax_bps not between 0 and 9999
    or p_overhead_bps is null or p_overhead_bps not between 0 and 9999
    or p_target_margin_bps is null or p_target_margin_bps not between 0 and 9999 then
    raise exception 'Custos e percentuais inválidos';
  end if;
  select * into v_product from public.products where id = p_product_id for update;
  if not found then raise exception 'Joia não encontrada'; end if;
  select acquisition_cost_cents into v_acquisition from public.jewelry_intake
    where product_id = p_product_id;
  if not found then raise exception 'Cadastre a joia antes de precificar'; end if;
  if not exists (select 1 from public.packaging_models where id = p_packaging_model_id) then
    raise exception 'Selecione um modelo de embalagem';
  end if;
  select sum(c.quantity::numeric * s.unit_cost_cents) into v_packaging
    from public.packaging_model_components c join public.stock_items s on s.id = c.item_id
    where c.model_id = p_packaging_model_id and s.kind = 'embalagem';
  if v_packaging is null then raise exception 'O modelo de embalagem não tem componentes'; end if;

  -- Cada lote durável distribui seu custo integral por 12 meses, sem perder centavos.
  select coalesce(sum(floor(total_cost / 12) +
    case when elapsed_months < mod(total_cost, 12) then 1 else 0 end), 0)
    into v_monthly_depreciation
  from (
    select (s.unit_cost_cents::numeric * s.acquired_quantity) as total_cost,
      ((extract(year from current_date)::integer - extract(year from s.acquired_on)::integer) * 12
      + extract(month from current_date)::integer - extract(month from s.acquired_on)::integer) as elapsed_months
    from public.stock_items s where s.kind = 'insumo' and s.acquired_on is not null
  ) asset where elapsed_months between 0 and 11;
  v_depreciation_per_piece := ceil(v_monthly_depreciation / p_monthly_sales_estimate);
  v_fixed := v_acquisition::numeric + v_packaging + v_depreciation_per_piece
    + p_labor_cost_cents + p_shipping_subsidy_cents + p_other_cost_cents;
  if v_fixed <= 0 or v_fixed > 2147483647 or v_packaging > 2147483647
     or v_monthly_depreciation > 2147483647 or v_depreciation_per_piece > 2147483647 then
    raise exception 'Custo total inválido ou fora do limite';
  end if;

  v_variable_bps := p_payment_fee_bps + p_tax_bps + p_overhead_bps;
  if p_manual_price_cents is null then
    v_mode := 'margem'; v_target_bps := p_target_margin_bps;
    if v_variable_bps + v_target_bps >= 10000 then raise exception 'Taxas e margem somam 100%% ou mais'; end if;
    v_price := ceil(v_fixed * 10000 / (10000 - v_variable_bps - v_target_bps));
  else
    v_mode := 'preco'; v_target_bps := 0; v_price := p_manual_price_cents;
    if v_variable_bps >= 10000 then raise exception 'Taxas somam 100%% ou mais'; end if;
  end if;
  if v_price <= 0 or v_price > 2147483647 then raise exception 'Preço de venda inválido ou fora do limite'; end if;
  v_margin := floor((v_price - v_fixed - v_price * v_variable_bps / 10000) * 10000 / v_price);

  insert into public.product_pricing(
    product_id, acquisition_cost_cents, packaging_model_id, packaging_cost_cents,
    depreciation_cost_cents, monthly_depreciation_cents, monthly_sales_estimate,
    labor_cost_cents, shipping_subsidy_cents, other_cost_cents,
    payment_fee_bps, tax_bps, overhead_bps, target_margin_bps,
    pricing_mode, approved_price_cents, estimated_margin_bps
  ) values (
    p_product_id, v_acquisition, p_packaging_model_id, v_packaging::integer,
    v_depreciation_per_piece::integer, v_monthly_depreciation::integer, p_monthly_sales_estimate,
    p_labor_cost_cents, p_shipping_subsidy_cents, p_other_cost_cents,
    p_payment_fee_bps, p_tax_bps, p_overhead_bps, v_target_bps,
    v_mode, v_price::integer, v_margin::bigint
  ) on conflict (product_id) do update set
    acquisition_cost_cents = excluded.acquisition_cost_cents,
    packaging_model_id = excluded.packaging_model_id,
    packaging_cost_cents = excluded.packaging_cost_cents,
    depreciation_cost_cents = excluded.depreciation_cost_cents,
    monthly_depreciation_cents = excluded.monthly_depreciation_cents,
    monthly_sales_estimate = excluded.monthly_sales_estimate,
    labor_cost_cents = excluded.labor_cost_cents,
    shipping_subsidy_cents = excluded.shipping_subsidy_cents,
    other_cost_cents = excluded.other_cost_cents,
    payment_fee_bps = excluded.payment_fee_bps,
    tax_bps = excluded.tax_bps,
    overhead_bps = excluded.overhead_bps,
    target_margin_bps = excluded.target_margin_bps,
    pricing_mode = excluded.pricing_mode,
    approved_price_cents = excluded.approved_price_cents,
    estimated_margin_bps = excluded.estimated_margin_bps;

  update public.products set price_cents = v_price::integer,
    workflow_stage = case when active then 'pronto' else 'aguardando_catalogo' end
    where id = p_product_id;
  return query select v_price::integer, v_margin::bigint, v_fixed::integer;
end;
$$;
revoke all on function public.save_jewelry_pricing(uuid,uuid,integer,integer,integer,integer,integer,integer,integer,integer,integer) from public, anon;
grant execute on function public.save_jewelry_pricing(uuid,uuid,integer,integer,integer,integer,integer,integer,integer,integer,integer) to authenticated;

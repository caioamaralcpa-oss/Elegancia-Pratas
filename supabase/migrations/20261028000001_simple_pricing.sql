-- Nova precificação: apenas aquisição, embalagem e rateio mensal dos insumos.
-- Fichas antigas e preços publicados não são alterados por esta migração.
create or replace function public.save_jewelry_pricing_simple(
  p_product_id uuid, p_packaging_model_id uuid, p_monthly_sales_estimate integer,
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
  v_price numeric;
  v_target_bps integer;
  v_margin numeric;
  v_mode text;
begin
  if not public.has_staff_role(array['administrador']) then raise exception 'Acesso negado'; end if;
  if p_monthly_sales_estimate is null or p_monthly_sales_estimate not between 1 and 1000000
    or p_target_margin_bps is null or p_target_margin_bps not between 0 and 9999 then
    raise exception 'Estimativa de vendas ou margem inválida';
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
  v_fixed := v_acquisition::numeric + v_packaging + v_depreciation_per_piece;
  if v_fixed <= 0 or v_fixed > 2147483647 or v_packaging > 2147483647
     or v_monthly_depreciation > 2147483647 or v_depreciation_per_piece > 2147483647 then
    raise exception 'Custo-base inválido ou fora do limite';
  end if;

  if p_manual_price_cents is null then
    v_mode := 'margem'; v_target_bps := p_target_margin_bps;
    v_price := ceil(v_fixed * 10000 / (10000 - v_target_bps));
  else
    v_mode := 'preco'; v_target_bps := 0; v_price := p_manual_price_cents;
  end if;
  if v_price <= 0 or v_price > 2147483647 then raise exception 'Preço de venda inválido ou fora do limite'; end if;
  v_margin := floor((v_price - v_fixed) * 10000 / v_price);

  insert into public.product_pricing(
    product_id, acquisition_cost_cents, packaging_model_id, packaging_cost_cents,
    depreciation_cost_cents, monthly_depreciation_cents, monthly_sales_estimate,
    labor_cost_cents, shipping_subsidy_cents, other_cost_cents,
    payment_fee_bps, tax_bps, overhead_bps, target_margin_bps,
    pricing_mode, approved_price_cents, estimated_margin_bps
  ) values (
    p_product_id, v_acquisition, p_packaging_model_id, v_packaging::integer,
    v_depreciation_per_piece::integer, v_monthly_depreciation::integer, p_monthly_sales_estimate,
    0, 0, 0, 0, 0, 0, v_target_bps,
    v_mode, v_price::integer, v_margin::bigint
  ) on conflict (product_id) do update set
    acquisition_cost_cents = excluded.acquisition_cost_cents,
    packaging_model_id = excluded.packaging_model_id,
    packaging_cost_cents = excluded.packaging_cost_cents,
    depreciation_cost_cents = excluded.depreciation_cost_cents,
    monthly_depreciation_cents = excluded.monthly_depreciation_cents,
    monthly_sales_estimate = excluded.monthly_sales_estimate,
    labor_cost_cents = 0,
    shipping_subsidy_cents = 0,
    other_cost_cents = 0,
    payment_fee_bps = 0,
    tax_bps = 0,
    overhead_bps = 0,
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

revoke all on function public.save_jewelry_pricing_simple(uuid,uuid,integer,integer,integer) from public, anon;
grant execute on function public.save_jewelry_pricing_simple(uuid,uuid,integer,integer,integer) to authenticated;
revoke all on function public.save_jewelry_pricing(uuid,uuid,integer,integer,integer,integer,integer,integer,integer,integer,integer) from public, anon, authenticated;

-- Nome de exibição privado da conta de gestão; não altera o papel de acesso.
alter table public.admin_users add column if not exists display_name text;
update public.admin_users a set display_name = 'Caio'
from auth.users u where u.id = a.user_id
  and lower(u.email) = 'caioamaralca@icloud.com' and a.display_name is null;

-- Somente administradores com MFA podem obter indicadores de vendas.
create or replace function public.get_admin_sales_dashboard()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_result jsonb;
begin
  if not public.has_staff_role(array['administrador']) then
    raise exception 'Acesso negado';
  end if;

  select jsonb_build_object(
    'paid_orders', (select count(*) from public.orders o where o.status in ('pago','em_preparacao','enviado','entregue')),
    'gross_revenue_cents', (select coalesce(sum(o.total_cents),0) from public.orders o where o.status in ('pago','em_preparacao','enviado','entregue')),
    'pending_orders', (select count(*) from public.orders o where o.status = 'aguardando_pagamento'),
    'months', (
      select coalesce(jsonb_agg(jsonb_build_object('month', to_char(m.month_start,'YYYY-MM'),
        'orders', coalesce(x.order_count,0), 'revenue_cents', coalesce(x.revenue_cents,0)) order by m.month_start), '[]'::jsonb)
      from generate_series(date_trunc('month', now() at time zone 'America/Sao_Paulo') - interval '5 months',
        date_trunc('month', now() at time zone 'America/Sao_Paulo'), interval '1 month') m(month_start)
      left join lateral (
        select count(*) as order_count, coalesce(sum(o.total_cents),0) as revenue_cents
        from public.orders o where o.status in ('pago','em_preparacao','enviado','entregue')
          and (o.created_at at time zone 'America/Sao_Paulo') >= m.month_start
          and (o.created_at at time zone 'America/Sao_Paulo') < m.month_start + interval '1 month'
      ) x on true
    ),
    'top_products', (
      select coalesce(jsonb_agg(jsonb_build_object('name', t.name, 'quantity', t.quantity,
        'revenue_cents', t.revenue_cents) order by t.quantity desc, t.revenue_cents desc), '[]'::jsonb)
      from (
        select max(i.product_name) as name, sum(i.quantity) as quantity,
          sum(i.quantity::bigint * i.unit_price_cents) as revenue_cents
        from public.order_items i join public.orders o on o.id = i.order_id
        where o.status in ('pago','em_preparacao','enviado','entregue')
        group by coalesce(i.product_id::text, i.product_name)
        order by quantity desc, revenue_cents desc limit 5
      ) t
    ),
    'recent_orders', (
      select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'status', r.status,
        'total_cents', r.total_cents, 'created_at', r.created_at) order by r.created_at desc), '[]'::jsonb)
      from (
        select o.id, o.status, o.total_cents, o.created_at from public.orders o
        order by o.created_at desc limit 5
      ) r
    )
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.get_admin_sales_dashboard() from public, anon;
grant execute on function public.get_admin_sales_dashboard() to authenticated;

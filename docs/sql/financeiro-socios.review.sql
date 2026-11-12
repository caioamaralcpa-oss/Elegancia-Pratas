-- PROPOSTA PARA REVISÃO. Executar primeiro em homologação; não aplicada em produção.
begin;
create table public.finance_accounts(id uuid primary key default gen_random_uuid(),name text not null check(length(trim(name)) between 1 and 80),opening_cents bigint not null default 0,created_at timestamptz not null default now());
create table public.finance_partners(id uuid primary key default gen_random_uuid(),partner_key text not null unique,name text not null,share_bps integer not null check(share_bps between 0 and 10000),user_id uuid unique references auth.users(id),cpf text,phone text,pix_key text);
insert into public.finance_partners(partner_key,name,share_bps) values ('aurizinete','Aurizinete',6000),('elizabete','Elizabete',2500),('caio','Caio',1500);
create table public.finance_sales(id uuid primary key default gen_random_uuid(),reference text not null unique check(length(trim(reference)) between 1 and 120),order_id uuid unique references public.orders(id),occurred_on date not null,channel text not null check(channel in ('site','presencial','outro')),delivery text not null check(delivery in ('envio','retirada')),account_id uuid not null references public.finance_accounts(id),revenue_cents bigint not null check(revenue_cents between 0 and 999999999999),shipping_collected_cents bigint not null default 0 check(shipping_collected_cents between 0 and 999999999999),cost_cents bigint check(cost_cents between 0 and 999999999999),fee_cents bigint not null default 0 check(fee_cents between 0 and 999999999999),shipping_paid_cents bigint not null default 0 check(shipping_paid_cents between 0 and 999999999999),cost_evidence text,created_by uuid not null default auth.uid(),created_at timestamptz not null default now(),check(cost_cents is null or (cost_evidence is not null and length(trim(cost_evidence))>0)));
create table public.finance_months(month date primary key check(extract(day from month)=1),profit_cents bigint not null,pool_cents bigint not null,retained_cents bigint not null,sales_count integer not null,closed_by uuid not null,closed_at timestamptz not null default now());
create table public.finance_payouts(id uuid primary key default gen_random_uuid(),month date not null references public.finance_months(month),partner_id uuid not null references public.finance_partners(id),share_bps integer not null,amount_cents bigint not null check(amount_cents>=0),paid_at timestamptz,paid_by uuid,unique(month,partner_id));
create table public.finance_entries(id uuid primary key default gen_random_uuid(),occurred_on date not null,account_id uuid not null references public.finance_accounts(id),direction text not null check(direction in ('entrada','saida')),category text not null check(length(trim(category)) between 1 and 80),description text not null check(length(trim(description)) between 1 and 240),amount_cents bigint not null check(amount_cents between 1 and 999999999999),impacts_profit boolean not null default false,sale_id uuid unique references public.finance_sales(id),related_sale_id uuid references public.finance_sales(id),payout_id uuid unique references public.finance_payouts(id),transfer_id uuid,created_by uuid not null default auth.uid(),created_at timestamptz not null default now(),check(not impacts_profit or direction='saida'),check(payout_id is null or (direction='saida' and not impacts_profit)),check(sale_id is null or (direction='entrada' and not impacts_profit)));
create index on public.finance_sales(occurred_on);
create index on public.finance_entries(occurred_on);
create index on public.finance_payouts(partner_id,month);
-- No existing helper, table, policy or pricing contract is changed.
do $block$ declare t text;begin foreach t in array array['finance_accounts','finance_partners','finance_sales','finance_months','finance_payouts','finance_entries'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy finance_admin_read on public.%I for select to authenticated using (public.has_staff_role(array[''administrador'']))',t);
end loop;end $block$;
create policy finance_partner_read_self on public.finance_partners for select to authenticated using(user_id=auth.uid() and auth.jwt()->>'aal'='aal2');
create policy finance_partner_read_payouts on public.finance_payouts for select to authenticated using(auth.jwt()->>'aal'='aal2' and exists(select 1 from public.finance_partners p where p.id=partner_id and p.user_id=auth.uid()));
create view public.finance_my_partner_profile with(security_invoker=true) as select id,name,cpf,phone,pix_key,share_bps from public.finance_partners where user_id=auth.uid();
create view public.finance_my_payouts with(security_invoker=true) as select v.id,v.month,v.amount_cents,v.paid_at from public.finance_payouts v join public.finance_partners p on p.id=v.partner_id where p.user_id=auth.uid();
revoke all on public.finance_my_partner_profile,public.finance_my_payouts from public,anon;
grant select on public.finance_my_partner_profile,public.finance_my_payouts to authenticated;
create function public.finance_require_admin() returns void language plpgsql stable security invoker set search_path='' as $f$ begin if not public.has_staff_role(array['administrador']) then raise exception 'Acesso financeiro negado';end if;end $f$;
create function public.finance_today() returns date language sql stable security invoker set search_path='' as $f$ select (now() at time zone 'America/Sao_Paulo')::date $f$;
create function public.finance_lock_open(p_day date) returns void language plpgsql security definer set search_path='' as $f$ declare m date:=date_trunc('month',p_day)::date;begin
 perform public.finance_require_admin();if p_day is null then raise exception 'Data obrigatória';end if;
 if p_day>public.finance_today() then raise exception 'Registre somente movimentações já realizadas';end if;
 perform pg_advisory_xact_lock(83021,(extract(year from m)::int*12+extract(month from m)::int));
 if exists(select 1 from public.finance_months where month=m) then raise exception 'Competência já fechada; registre um ajuste em competência aberta';end if;
end $f$;
create function public.finance_create_account(p_name text,p_opening bigint) returns uuid language plpgsql security definer set search_path='' as $f$ declare v uuid;begin perform public.finance_require_admin();insert into public.finance_accounts(name,opening_cents)values(trim(p_name),p_opening)returning id into v;return v;end $f$;
create function public.finance_add_entry(p_day date,p_account uuid,p_direction text,p_category text,p_description text,p_amount bigint,p_impacts_profit boolean) returns uuid language plpgsql security definer set search_path='' as $f$ declare v uuid;begin
 perform public.finance_lock_open(p_day);
 if p_category in('repasse_societario','transferencia','venda','taxa_venda','frete_venda') then raise exception 'Use a operação específica de venda, transferência ou repasse';end if;
 insert into public.finance_entries(occurred_on,account_id,direction,category,description,amount_cents,impacts_profit)values(p_day,p_account,p_direction,trim(p_category),trim(p_description),p_amount,p_impacts_profit)returning id into v;return v;
end $f$;
create function public.finance_transfer(p_day date,p_from uuid,p_to uuid,p_amount bigint,p_description text) returns uuid language plpgsql security definer set search_path='' as $f$ declare v uuid:=gen_random_uuid();begin
 perform public.finance_lock_open(p_day);if p_from=p_to then raise exception 'Escolha contas diferentes';end if;
 insert into public.finance_entries(occurred_on,account_id,direction,category,description,amount_cents,transfer_id)values(p_day,p_from,'saida','transferencia',p_description,p_amount,v),(p_day,p_to,'entrada','transferencia',p_description,p_amount,v);return v;end $f$;
create function public.finance_record_sale(p_day date,p_reference text,p_order uuid,p_channel text,p_delivery text,p_account uuid,p_revenue bigint,p_shipping_collected bigint,p_cost bigint,p_fee bigint,p_shipping_paid bigint,p_evidence text,p_fee_account uuid default null,p_shipping_account uuid default null) returns uuid language plpgsql security definer set search_path='' as $f$ declare v uuid;begin
 perform public.finance_lock_open(p_day);
 if p_fee>0 and p_fee_account is null then raise exception 'Escolha a conta das taxas pagas';end if;
 if p_shipping_paid>0 and p_shipping_account is null then raise exception 'Escolha a conta do frete pago';end if;
 if p_channel='site' and p_order is null then raise exception 'Vincule o pedido do site para impedir duplicidade';end if;
 if p_order is not null then
  if p_channel<>'site' or not exists(select 1 from public.orders where id=p_order and status in('pago','em_preparacao','enviado','entregue') and subtotal_cents=p_revenue and shipping_cents=p_shipping_collected) then raise exception 'Pedido não pago ou valores divergentes';end if;
 end if;
 insert into public.finance_sales(occurred_on,reference,order_id,channel,delivery,account_id,revenue_cents,shipping_collected_cents,cost_cents,fee_cents,shipping_paid_cents,cost_evidence)values(p_day,trim(p_reference),p_order,p_channel,p_delivery,p_account,p_revenue,p_shipping_collected,p_cost,p_fee,p_shipping_paid,p_evidence)returning id into v;
 if p_revenue+p_shipping_collected>0 then insert into public.finance_entries(occurred_on,account_id,direction,category,description,amount_cents,sale_id)values(p_day,p_account,'entrada','venda','Recebimento da venda '||p_reference,p_revenue+p_shipping_collected,v);end if;
 if p_fee>0 then insert into public.finance_entries(occurred_on,account_id,direction,category,description,amount_cents,related_sale_id)values(p_day,p_fee_account,'saida','taxa_venda','Taxas pagas da venda '||p_reference,p_fee,v);end if;
 if p_shipping_paid>0 then insert into public.finance_entries(occurred_on,account_id,direction,category,description,amount_cents,related_sale_id)values(p_day,p_shipping_account,'saida','frete_venda','Frete pago da venda '||p_reference,p_shipping_paid,v);end if;
 return v;
end $f$;
create function public.finance_month_summary(p_month date) returns jsonb language plpgsql stable security definer set search_path='' as $f$
declare m date:=date_trunc('month',p_month)::date;v_sales bigint;v_cost bigint;v_fees bigint;v_shipping bigint;v_expenses bigint;v_missing int;v_count int;begin
 perform public.finance_require_admin();
 select count(*),count(*)filter(where cost_cents is null),coalesce(sum(revenue_cents+shipping_collected_cents),0),coalesce(sum(cost_cents),0),coalesce(sum(fee_cents),0),coalesce(sum(shipping_paid_cents),0) into v_count,v_missing,v_sales,v_cost,v_fees,v_shipping from public.finance_sales where occurred_on>=m and occurred_on<(m+interval '1 month');
 select coalesce(sum(amount_cents),0)into v_expenses from public.finance_entries where occurred_on>=m and occurred_on<(m+interval '1 month') and impacts_profit;
 return jsonb_build_object('month',m,'sales_count',v_count,'missing_costs',v_missing,'revenue_cents',v_sales,'cost_cents',v_cost,'fee_cents',v_fees,'shipping_paid_cents',v_shipping,'expenses_cents',v_expenses,'profit_cents',case when v_missing=0 then v_sales-v_cost-v_fees-v_shipping-v_expenses else null end,'closed',exists(select 1 from public.finance_months where month=m));
end $f$;
create function public.finance_close_month(p_month date,p_reconciled boolean default false) returns jsonb language plpgsql security definer set search_path='' as $f$
declare m date:=date_trunc('month',p_month)::date;s jsonb;profit bigint;pool bigint;begin
 perform public.finance_lock_open(m);
 if p_reconciled is distinct from true then raise exception 'Confirme a conferência das vendas e despesas antes de fechar';end if;
 if m<date '2026-12-01' or m>=date '2027-06-01' then raise exception 'Plano válido de dezembro/2026 a maio/2027';end if;
 if (m+interval '1 month')::date>public.finance_today() then raise exception 'Aguarde o término da competência';end if;
 if (select count(*)<>3 or coalesce(sum(share_bps),0)<>10000 from public.finance_partners) then raise exception 'Participações precisam somar 100%% entre três sócios';end if;
 s:=public.finance_month_summary(m);
 if (s->>'missing_costs')::int>0 then raise exception 'Há vendas sem custo comprovado';end if;
 profit:=(s->>'profit_cents')::bigint;if profit<0 then raise exception 'Mês com prejuízo requer análise; repasse não fechado';end if;pool:=profit/2;
 insert into public.finance_months(month,profit_cents,pool_cents,retained_cents,sales_count,closed_by)values(m,profit,pool,profit-pool,(s->>'sales_count')::int,auth.uid());
 with base as(select id,share_bps,floor(pool::numeric*share_bps/10000)::bigint amount,mod(pool::numeric*share_bps,10000) rem from public.finance_partners),
 ranked as(select *,row_number()over(order by rem desc,id::text)rn from base),
 rest as(select pool-sum(amount) n from base)
 insert into public.finance_payouts(month,partner_id,share_bps,amount_cents)select m,id,share_bps,amount+case when rn<=rest.n then 1 else 0 end from ranked cross join rest;
 return public.finance_month_summary(m);
end $f$;
create function public.finance_mark_paid(p_payout uuid,p_account uuid,p_day date) returns void language plpgsql security definer set search_path='' as $f$
declare v public.finance_payouts;begin
 perform public.finance_lock_open(p_day);select * into v from public.finance_payouts where id=p_payout for update;
 if not found or v.paid_at is not null then raise exception 'Repasse inexistente ou já pago';end if;
 if p_day>public.finance_today() then raise exception 'Não registre pagamento futuro como realizado';end if;
 if p_day<v.month then raise exception 'Pagamento anterior à competência';end if;
 if v.amount_cents>0 then insert into public.finance_entries(occurred_on,account_id,direction,category,description,amount_cents,payout_id)values(p_day,p_account,'saida','repasse_societario','Repasse de lucros fechado',v.amount_cents,v.id);end if;
 update public.finance_payouts set paid_at=p_day::timestamptz,paid_by=auth.uid()where id=v.id;
end $f$;

create function public.finance_set_sale_cost(p_sale uuid,p_cost bigint,p_evidence text) returns void language plpgsql security definer set search_path='' as $f$
declare s public.finance_sales;begin
 perform public.finance_require_admin();select * into s from public.finance_sales where id=p_sale;
 if not found then raise exception 'Venda inexistente';end if;
 perform public.finance_lock_open(s.occurred_on);
 if p_cost is null or p_cost<0 or p_evidence is null or length(trim(p_evidence))=0 then raise exception 'Informe custo e referência de conferência';end if;
 update public.finance_sales set cost_cents=p_cost,cost_evidence=p_evidence where id=p_sale;
end $f$;
create table public.finance_audit_log(id bigint generated always as identity primary key,actor_id uuid not null,action text not null,table_name text not null,row_id uuid,occurred_at timestamptz not null default now(),old_data jsonb,new_data jsonb);
alter table public.finance_audit_log enable row level security;
revoke all on public.finance_audit_log from public,anon,authenticated;
grant select on public.finance_audit_log to authenticated;
create policy finance_audit_admin on public.finance_audit_log for select to authenticated using(public.has_staff_role(array['administrador']));
create function public.finance_audit_change() returns trigger language plpgsql security definer set search_path='' as $f$ begin
 insert into public.finance_audit_log(actor_id,action,table_name,row_id,old_data,new_data)values(auth.uid(),tg_op,tg_table_name,case when tg_table_name='finance_months' then null else (to_jsonb(new)->>'id')::uuid end,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));return new;end $f$;
do $block$ declare t text;begin foreach t in array array['finance_accounts','finance_sales','finance_entries','finance_months','finance_payouts'] loop execute format('create trigger finance_audit after insert or update on public.%I for each row execute function public.finance_audit_change()',t);end loop;end $block$;


create function public.finance_register_partner(p_key text,p_email text,p_cpf text,p_phone text,p_pix text) returns void language plpgsql security definer set search_path='' as $f$
declare u uuid;v uuid;digits text:=regexp_replace(coalesce(p_cpf,''),'\D','','g');n int;digit int;begin
 perform public.finance_require_admin();
 if digits!~'^[0-9]{11}$' or digits=repeat(left(digits,1),11) then raise exception 'CPF inválido';end if;
 for n in 10..11 loop select mod(mod(sum(substr(digits,i,1)::int*(n+1-i))*10,11),10)into digit from generate_series(1,n-1)i;if substr(digits,n,1)::int<>digit then raise exception 'CPF inválido';end if;end loop;
 if regexp_replace(coalesce(p_phone,''),'\D','','g')!~'^[0-9]{10,15}$' or length(trim(coalesce(p_pix,''))) not between 1 and 140 then raise exception 'Telefone ou chave Pix inválidos';end if;
 select id into u from auth.users where lower(email)=lower(trim(p_email));
 if u is null then raise exception 'Cadastre primeiro a conta de consulta no serviço de autenticação';end if;
 if p_key in('aurizinete','elizabete') and exists(select 1 from public.admin_users where user_id=u) then raise exception 'A conta de consulta não deve ter acesso administrativo';end if;
 update public.finance_partners set user_id=u,cpf=digits,phone=trim(p_phone),pix_key=trim(p_pix)where partner_key=p_key and user_id is null and cpf is null and phone is null and pix_key is null returning id into v;
 if not found then raise exception 'Cadastro já preenchido ou sócio inexistente; telas de consulta não permitem edição';end if;
 insert into public.finance_audit_log(actor_id,action,table_name,row_id)values(auth.uid(),'INITIALIZE','finance_partners',v);
end $f$;
-- No direct write grant exists for authenticated clients. All mutations pass the admin+MFA gate.
do $block$ declare r record;begin for r in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any(array['finance_require_admin','finance_today','finance_lock_open','finance_create_account','finance_add_entry','finance_transfer','finance_record_sale','finance_month_summary','finance_close_month','finance_mark_paid','finance_set_sale_cost','finance_audit_change','finance_register_partner']) loop
 execute format('revoke all on function %s from public,anon,authenticated',r.signature);
 execute format('grant execute on function %s to authenticated',r.signature);
end loop;end $block$;
commit;

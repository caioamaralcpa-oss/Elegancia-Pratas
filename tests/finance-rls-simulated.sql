-- SOMENTE banco PostgreSQL isolado e vazio chamado finance_rls_scratch.
-- Exemplo: psql -X -v ON_ERROR_STOP=1 -d finance_rls_scratch -f tests/finance-rls-simulated.sql
-- Simula os claims JWT e as funções auth do Supabase. Não valida autenticação,
-- emissão de tokens ou o serviço Supabase real. Todos os dados são fictícios.
\set ON_ERROR_STOP on
begin;
do $$ begin
  if current_database() <> 'finance_rls_scratch' then
    raise exception 'Execute apenas no banco isolado finance_rls_scratch';
  end if;
end $$;
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb
$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid(),auth.jwt() to authenticated;
create table public.admin_users(user_id uuid primary key references auth.users(id), role text);
create table public.admin_audit_log(id bigint generated always as identity primary key,actor_id uuid,action text,table_name text,row_id uuid,occurred_at timestamptz default now());
-- Reproduz a política de autorização da aplicação; não autentica usuários.
create function public.has_staff_role(required_roles text[]) returns boolean language sql stable security definer set search_path='' as $$
  select (auth.jwt() ->> 'aal') = 'aal2'
    and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()) and a.role = any(required_roles));
$$;
create function public.log_admin_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.admin_audit_log(actor_id,action,table_name,row_id) values (auth.uid(),tg_op,tg_table_name,new.id);
  return new;
end;
$$;
insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
insert into public.admin_users values ('00000000-0000-0000-0000-000000000001','administrador');
\ir ../supabase/migrations/20261109201022_financial_cash_entries.sql

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false), set_config('request.jwt.claims','{"aal":"aal2"}',false);
insert into public.finance_entries(direction,description,category,amount_cents,movement_date,planned_date,status) values ('entrada','Venda','Vendas',1000,'2026-11-01','2026-11-01','previsto');
update public.finance_entries set status='realizado',movement_date='2026-11-02' where status='previsto';
update public.finance_entries set status='cancelado',cancellation_reason='Correção' where status='realizado';
do $$ begin
  if (select count(*) from public.finance_entry_history) <> 3 then raise exception 'Falha no histórico'; end if;
  if not exists (select 1 from public.finance_entries where status='cancelado' and planned_date='2026-11-01' and movement_date='2026-11-02') then
    raise exception 'Datas ou cancelamento incorretos';
  end if;
  begin update public.finance_entries set amount_cents=1; raise exception 'Valor não deveria poder ser alterado'; exception when insufficient_privilege then null; end;
  begin delete from public.finance_entries; raise exception 'Exclusão não deveria ser permitida'; exception when insufficient_privilege then null; end;
  begin insert into public.finance_entry_history(entry_id,actor_id,action,after_data) select id,auth.uid(),'INSERT','{}' from public.finance_entries limit 1; raise exception 'Histórico não deveria poder ser alterado'; exception when insufficient_privilege then null; end;
end $$;

insert into public.finance_entries(direction,description,category,amount_cents,movement_date,status) values ('entrada','Recebimento','Vendas',2500,'2026-11-02','realizado');
insert into public.finance_entries(direction,description,category,amount_cents,movement_date,planned_date,status) values ('saida','Conta','Despesas',500,'2026-11-03','2026-11-03','previsto');
do $$ declare snapshot jsonb; nextpage jsonb; cursor_value jsonb; begin
  snapshot := public.finance_month_snapshot('2026-11-01', 1);
  if (snapshot->>'income_cents')::bigint <> 2500 or (snapshot->>'pending_expense_cents')::bigint <> 500 or (snapshot->>'expense_cents')::bigint <> 0 or (snapshot->>'entry_count')::bigint <> 3 then
    raise exception 'Totais mensais incorretos: %',snapshot;
  end if;
  cursor_value := snapshot->'next_cursor';
  if cursor_value is null or cursor_value = 'null'::jsonb then raise exception 'Cursor ausente'; end if;
  nextpage := public.finance_month_snapshot('2026-11-01', 1, (cursor_value->>'movement_date')::date, (cursor_value->>'created_at')::timestamptz, (cursor_value->>'id')::uuid);
  if (snapshot->'entries'->0->>'id') = (nextpage->'entries'->0->>'id') then raise exception 'Página repetida'; end if;
end $$;

select set_config('request.jwt.claims','{"aal":"aal1"}',false);
do $$ begin
  if (select count(*) from public.finance_entries) <> 0 or (select count(*) from public.finance_entry_history) <> 0 then raise exception 'Admin sem MFA leu dados'; end if;
  begin perform public.finance_month_snapshot('2026-11-01'); raise exception 'Admin sem MFA consultou totais'; exception when insufficient_privilege then null; end;
  begin insert into public.finance_entries(direction,description,category,amount_cents,movement_date,status) values ('entrada','Teste','teste',1,'2026-11-01','realizado'); raise exception 'Admin sem MFA gravou'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false), set_config('request.jwt.claims','{"aal":"aal2"}',false);
do $$ begin
  if (select count(*) from public.finance_entries) <> 0 or (select count(*) from public.finance_entry_history) <> 0 then raise exception 'Usuário sem papel leu dados'; end if;
  begin perform public.finance_month_snapshot('2026-11-01'); raise exception 'Usuário sem papel consultou totais'; exception when insufficient_privilege then null; end;
  begin insert into public.finance_entries(direction,description,category,amount_cents,movement_date,status) values ('entrada','Teste','teste',1,'2026-11-01','realizado'); raise exception 'Usuário sem papel gravou'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  if has_table_privilege('anon','public.finance_entries','select') or has_table_privilege('anon','public.finance_entry_history','select') then raise exception 'Anon tem acesso'; end if;
  if has_table_privilege('authenticated','public.finance_entry_history','insert') then raise exception 'Histórico aceita escrita direta'; end if;
end $$;
rollback;

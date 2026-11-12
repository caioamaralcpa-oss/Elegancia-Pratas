-- SOMENTE homologação/rollback autorizado. Arquivar os novos dados financeiros antes da execução.
-- Não contém alterações dos objetos antigos da loja.
begin;
drop view if exists public.finance_my_payouts;
drop view if exists public.finance_my_partner_profile;
drop table if exists public.finance_entries;
drop table if exists public.finance_payouts;
drop table if exists public.finance_months;
drop table if exists public.finance_sales;
drop table if exists public.finance_partners;
drop table if exists public.finance_accounts;
drop table if exists public.finance_audit_log;
do $block$ declare r record;begin for r in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any(array['finance_require_admin','finance_today','finance_lock_open','finance_create_account','finance_add_entry','finance_transfer','finance_record_sale','finance_month_summary','finance_close_month','finance_mark_paid','finance_set_sale_cost','finance_audit_change','finance_register_partner']) loop execute format('drop function %s',r.signature);end loop;end $block$;
commit;

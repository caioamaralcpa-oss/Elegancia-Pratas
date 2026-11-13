-- Preferir reverter a implantação/flag e preservar registros. Excluir dados exige backup e autorização próprios.
begin;
do $b$ declare r record;begin
 for r in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname=any(array['campaign_require_admin','campaign_save_event','campaign_save_plan','campaign_save_idea','campaign_archive','campaign_reserve_ai','campaign_finish_ai','campaign_usage_summary'])loop
 execute format('drop function %s',r.signature);
 end loop;end $b$;
drop table public.campaign_ideas;
drop table public.campaign_plans;
drop table public.campaign_ai_usage;
drop table public.campaign_events;
commit;

-- Estrutura aditiva: testar em homologação antes de produção. Não altera objetos antigos.
begin;
create table public.campaign_events (
 id uuid primary key default gen_random_uuid(), title text not null check(length(trim(title)) between 2 and 120),
 occurs_on date not null check(occurs_on between date '2020-01-01' and date '2100-12-31'),
 annual boolean not null default false, notes text not null default '' check(length(notes)<=500),
 archived boolean not null default false, created_by uuid not null default auth.uid(),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.campaign_plans (
 id uuid primary key default gen_random_uuid(), collection_id uuid references public.collections(id),
 title text not null check(length(trim(title)) between 2 and 120), starts_on date not null, ends_on date not null,
 goal text not null check(length(trim(goal)) between 2 and 700), audience text not null default '' check(length(audience)<=300),
 responsible text not null default '' check(length(responsible)<=100), event_key text not null default '' check(length(event_key)<=120),
 status text not null default 'ideia' check(status in('ideia','preparacao','aprovada','concluida')),
 archived boolean not null default false, created_by uuid not null default auth.uid(),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(starts_on<=ends_on and starts_on>=date '2020-01-01' and ends_on<=date '2100-12-31')
);
create table public.campaign_ideas (
 id uuid primary key default gen_random_uuid(), collection_id uuid references public.collections(id),
 plan_id uuid references public.campaign_plans(id), brief jsonb not null check(jsonb_typeof(brief)='object' and octet_length(brief::text)<=6000),
 content jsonb not null check(jsonb_typeof(content)='object' and octet_length(content::text)<=40000),
 source text not null check(source in('ia','manual')), archived boolean not null default false,
 created_by uuid not null default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.campaign_ai_usage (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), created_at timestamptz not null default now(),
 state text not null default 'reserved' check(state in('reserved','completed','failed')),
 model text not null default '' check(length(model)<=120)
);
create index campaign_usage_created on public.campaign_ai_usage(created_at);
create function public.campaign_require_admin() returns void language plpgsql stable security invoker set search_path='' as $f$
begin if not coalesce(public.has_staff_role(array['administrador']),false) then raise exception 'Acesso de administrador com segundo fator necessário';end if;end $f$;
do $b$ declare t text;begin
 foreach t in array array['campaign_events','campaign_plans','campaign_ideas','campaign_ai_usage'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy campaign_admin_read on public.%I for select to authenticated using(public.has_staff_role(array[''administrador'']))',t);
 end loop;
end $b$;
create function public.campaign_save_event(p_id uuid,p_title text,p_day date,p_annual boolean,p_notes text) returns uuid
language plpgsql security definer set search_path='' as $f$ declare v uuid;begin
 perform public.campaign_require_admin();
 if p_id is null then
 insert into public.campaign_events(title,occurs_on,annual,notes) values(trim(p_title),p_day,coalesce(p_annual,false),coalesce(p_notes,'')) returning id into v;
 else update public.campaign_events set title=trim(p_title),occurs_on=p_day,annual=coalesce(p_annual,false),notes=coalesce(p_notes,''),updated_at=now() where id=p_id and not archived returning id into v;
 if v is null then raise exception 'Evento não encontrado';end if;end if;return v;
end $f$;
create function public.campaign_save_plan(p_id uuid,p_collection uuid,p_title text,p_start date,p_end date,p_goal text,p_audience text,p_responsible text,p_status text,p_event_key text) returns uuid
language plpgsql security definer set search_path='' as $f$ declare v uuid;begin
 perform public.campaign_require_admin();
 if p_id is null then
 insert into public.campaign_plans(collection_id,title,starts_on,ends_on,goal,audience,responsible,status,event_key)
 values(p_collection,trim(p_title),p_start,p_end,trim(p_goal),coalesce(p_audience,''),coalesce(p_responsible,''),p_status,coalesce(p_event_key,'')) returning id into v;
 else update public.campaign_plans set collection_id=p_collection,title=trim(p_title),starts_on=p_start,ends_on=p_end,goal=trim(p_goal),audience=coalesce(p_audience,''),responsible=coalesce(p_responsible,''),status=p_status,event_key=coalesce(p_event_key,''),updated_at=now() where id=p_id and not archived returning id into v;
 if v is null then raise exception 'Campanha não encontrada';end if;end if;return v;
end $f$;
create function public.campaign_save_idea(p_id uuid,p_collection uuid,p_plan uuid,p_brief jsonb,p_content jsonb,p_source text) returns uuid
language plpgsql security definer set search_path='' as $f$ declare v uuid;begin
 perform public.campaign_require_admin();
 if p_plan is not null and not exists(select 1 from public.campaign_plans where id=p_plan and not archived and collection_id is not distinct from p_collection) then raise exception 'Coleção e campanha incompatíveis';end if;
 if p_id is null then
 insert into public.campaign_ideas(collection_id,plan_id,brief,content,source)values(p_collection,p_plan,p_brief,p_content,p_source)returning id into v;
 else update public.campaign_ideas set collection_id=p_collection,plan_id=p_plan,brief=p_brief,content=p_content,updated_at=now()where id=p_id and not archived returning id into v;
 if v is null then raise exception 'Inspiração não encontrada';end if;end if;return v;
end $f$;
create function public.campaign_archive(p_kind text,p_id uuid) returns void
language plpgsql security definer set search_path='' as $f$ declare t text;n int;begin
 perform public.campaign_require_admin();
 t:=case p_kind when 'event' then 'campaign_events' when 'plan' then 'campaign_plans' when 'idea' then 'campaign_ideas' end;
 if t is null then raise exception 'Tipo inválido';end if;
 execute format('update public.%I set archived=true,updated_at=now()where id=$1 and not archived',t)using p_id;
 get diagnostics n=row_count;if n<>1 then raise exception 'Registro não encontrado';end if;
end $f$;
create function public.campaign_reserve_ai() returns uuid
language plpgsql security definer set search_path='' as $f$
declare v uuid;month_start timestamptz:=date_trunc('month',now()at time zone 'America/Sao_Paulo')at time zone 'America/Sao_Paulo';
 day_start timestamptz:=date_trunc('day',now()at time zone 'America/Sao_Paulo')at time zone 'America/Sao_Paulo';
begin
 perform public.campaign_require_admin();perform pg_advisory_xact_lock(48231,77);
 if (select count(*)from public.campaign_ai_usage where created_at>=month_start)>=60 then raise exception 'Limite de 60 tentativas mensais atingido';end if;
 if (select count(*)from public.campaign_ai_usage where user_id=auth.uid()and created_at>=day_start)>=5 then raise exception 'Limite de 5 tentativas diárias por administrador atingido';end if;
 if exists(select 1 from public.campaign_ai_usage where user_id=auth.uid()and created_at>now()-interval '60 seconds') then raise exception 'Aguarde um minuto entre solicitações';end if;
 insert into public.campaign_ai_usage default values returning id into v;return v;
end $f$;
create function public.campaign_finish_ai(p_id uuid,p_ok boolean,p_model text) returns void
language plpgsql security definer set search_path='' as $f$ begin
 perform public.campaign_require_admin();
 update public.campaign_ai_usage set state=case when p_ok then 'completed' else 'failed' end,model=p_model where id=p_id and user_id=auth.uid()and state='reserved';
end $f$;
do $b$ declare r record;begin
 for r in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any(array['campaign_require_admin','campaign_save_event','campaign_save_plan','campaign_save_idea','campaign_archive','campaign_reserve_ai','campaign_finish_ai']) loop
 execute format('revoke all on function %s from public,anon,authenticated',r.signature);
 execute format('grant execute on function %s to authenticated',r.signature);
 end loop;end $b$;
create function public.campaign_usage_summary() returns jsonb language plpgsql stable security definer set search_path='' as $f$
declare m timestamptz:=date_trunc('month',now()at time zone 'America/Sao_Paulo')at time zone 'America/Sao_Paulo';
 d timestamptz:=date_trunc('day',now()at time zone 'America/Sao_Paulo')at time zone 'America/Sao_Paulo';
begin perform public.campaign_require_admin();return jsonb_build_object('monthlyUsed',(select count(*)from public.campaign_ai_usage where created_at>=m),'dailyUsed',(select count(*)from public.campaign_ai_usage where user_id=auth.uid()and created_at>=d),'monthlyLimit',60,'dailyLimit',5);end $f$;
revoke all on function public.campaign_usage_summary() from public,anon,authenticated;
grant execute on function public.campaign_usage_summary() to authenticated;

commit;

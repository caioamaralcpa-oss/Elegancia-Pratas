-- Manual cash entries. Sales and stock are not changed by these records.
create table public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  direction text not null check (direction in ('entrada', 'saida')),
  description text not null check (length(trim(description)) between 1 and 160),
  category text not null check (length(trim(category)) between 1 and 80),
  amount_cents integer not null check (amount_cents > 0 and amount_cents <= 1000000000),
  movement_date date not null,
  planned_date date,
  status text not null check (status in ('previsto', 'realizado', 'cancelado')),
  cancellation_reason text check (cancellation_reason is null or length(trim(cancellation_reason)) between 3 and 500),
  channel text check (channel is null or channel in ('site', 'presencial', 'whatsapp', 'instagram', 'outro')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  constraint finance_planned_date check (status <> 'previsto' or (planned_date is not null and planned_date = movement_date)),
  constraint finance_cancellation_reason check ((status = 'cancelado') = (cancellation_reason is not null))
);
create index finance_entries_date_idx on public.finance_entries (movement_date desc, created_at desc);
alter table public.finance_entries enable row level security;
revoke all on public.finance_entries from anon, authenticated;
grant select, insert on public.finance_entries to authenticated;
grant update (status, movement_date, cancellation_reason) on public.finance_entries to authenticated;
create policy "finance admin read with mfa" on public.finance_entries for select to authenticated
  using (public.has_staff_role(array['administrador']));
create policy "finance admin insert with mfa" on public.finance_entries for insert to authenticated
  with check (public.has_staff_role(array['administrador']) and created_by = (select auth.uid()) and status in ('previsto', 'realizado'));
create policy "finance admin update with mfa" on public.finance_entries for update to authenticated
  using (public.has_staff_role(array['administrador']) and status in ('previsto', 'realizado'))
  with check (public.has_staff_role(array['administrador']) and status in ('realizado', 'cancelado'));
create trigger audit_finance_entries after insert or update on public.finance_entries
  for each row execute function public.log_admin_change();

-- Historical snapshots allow corrections through cancellation and a replacement entry.
create table public.finance_entry_history (
  id bigint generated always as identity primary key,
  entry_id uuid not null references public.finance_entries(id),
  actor_id uuid not null references auth.users(id),
  action text not null check (action in ('INSERT','UPDATE')),
  before_data jsonb,
  after_data jsonb not null,
  occurred_at timestamptz not null default now()
);
create index finance_history_entry_idx on public.finance_entry_history(entry_id, occurred_at desc);
alter table public.finance_entry_history enable row level security;
revoke all on public.finance_entry_history from public, anon, authenticated;
grant select on public.finance_entry_history to authenticated;
create policy "finance history admin read with mfa" on public.finance_entry_history for select to authenticated
  using (public.has_staff_role(array['administrador']));
create function public.record_finance_entry_history() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.finance_entry_history(entry_id, actor_id, action, before_data, after_data)
    values (new.id, auth.uid(), tg_op, case when tg_op = 'UPDATE' then to_jsonb(old) else null end, to_jsonb(new));
  return new;
end;
$$;
revoke all on function public.record_finance_entry_history() from public, anon, authenticated;
create trigger finance_entry_history after insert or update on public.finance_entries
  for each row execute function public.record_finance_entry_history();

-- Trigger functions are not APIs; deny the browser roles explicitly.
revoke execute on function public.log_admin_change() from anon, authenticated;
revoke execute on function public.has_staff_role(text[]) from anon;

create function public.guard_finance_transition() returns trigger language plpgsql set search_path = '' as $$
begin
  if not ((old.status = 'previsto' and new.status in ('realizado','cancelado')) or (old.status = 'realizado' and new.status = 'cancelado')) then
    raise exception 'Transição financeira inválida';
  end if;
  if new.status = 'cancelado' and new.movement_date is distinct from old.movement_date then
    raise exception 'Cancelamento não pode alterar a data do lançamento';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_finance_transition() from public, anon, authenticated;
create trigger finance_transition before update on public.finance_entries
  for each row execute function public.guard_finance_transition();

-- One statement returns the monthly totals and the first or next page using the same snapshot.
create index finance_entries_page_idx on public.finance_entries (movement_date desc, created_at desc, id desc);
create function public.finance_month_snapshot(
  p_month date,
  p_limit integer default 100,
  p_before_date date default null,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_result jsonb;
begin
  if not coalesce(public.has_staff_role(array['administrador']), false) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  if p_month is null or p_month < date '1900-01-01' or p_month >= date '9999-01-01'
     or date_trunc('month', p_month::timestamp)::date <> p_month then
    raise exception 'Mês inválido' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'Limite inválido' using errcode = '22023';
  end if;
  if num_nonnulls(p_before_date, p_before_created_at, p_before_id) not in (0, 3) then
    raise exception 'Cursor inválido' using errcode = '22023';
  end if;

  with month_entries as materialized (
    select e.id, e.direction, e.description, e.category, e.amount_cents,
      e.movement_date, e.planned_date, e.status, e.cancellation_reason, e.channel, e.created_at
    from public.finance_entries e
    where e.movement_date >= p_month and e.movement_date < (p_month + interval '1 month')::date
  ), totals as (
    select
      coalesce(sum(amount_cents) filter (where direction = 'entrada' and status = 'realizado'), 0) as income,
      coalesce(sum(amount_cents) filter (where direction = 'saida' and status = 'realizado'), 0) as expense,
      coalesce(sum(amount_cents) filter (where direction = 'entrada' and status = 'previsto'), 0) as pending_income,
      coalesce(sum(amount_cents) filter (where direction = 'saida' and status = 'previsto'), 0) as pending_expense,
      count(*) as entry_count
    from month_entries
  ), page_plus_one as materialized (
    select * from month_entries
    where p_before_date is null or (movement_date, created_at, id) < (p_before_date, p_before_created_at, p_before_id)
    order by movement_date desc, created_at desc, id desc
    limit p_limit + 1
  ), visible_page as (
    select * from page_plus_one order by movement_date desc, created_at desc, id desc limit p_limit
  )
  select jsonb_build_object(
    'income_cents', t.income,
    'expense_cents', t.expense,
    'pending_income_cents', t.pending_income,
    'pending_expense_cents', t.pending_expense,
    'entry_count', t.entry_count,
    'entries', coalesce((select jsonb_agg(to_jsonb(v) order by v.movement_date desc, v.created_at desc, v.id desc) from visible_page v), '[]'::jsonb),
    'next_cursor', case when (select count(*) from page_plus_one) > p_limit then
      (select jsonb_build_object('movement_date', v.movement_date, 'created_at', v.created_at, 'id', v.id)
       from visible_page v order by v.movement_date asc, v.created_at asc, v.id asc limit 1)
      else null end
  ) into v_result from totals t;
  return v_result;
end;
$$;
revoke all on function public.finance_month_snapshot(date, integer, date, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.finance_month_snapshot(date, integer, date, timestamptz, uuid) to authenticated;

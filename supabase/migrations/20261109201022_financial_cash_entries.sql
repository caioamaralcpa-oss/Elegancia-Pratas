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

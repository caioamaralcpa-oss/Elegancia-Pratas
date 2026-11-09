-- Manual cash entries. Sales and stock are not changed by these records.
create table public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  direction text not null check (direction in ('entrada', 'saida')),
  description text not null check (length(trim(description)) between 1 and 160),
  category text not null check (length(trim(category)) between 1 and 80),
  amount_cents integer not null check (amount_cents > 0 and amount_cents <= 1000000000),
  movement_date date not null,
  status text not null check (status in ('previsto', 'realizado')),
  channel text check (channel is null or channel in ('site', 'presencial', 'whatsapp', 'instagram', 'outro')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
create index finance_entries_date_idx on public.finance_entries (movement_date desc, created_at desc);
alter table public.finance_entries enable row level security;
revoke all on public.finance_entries from anon, authenticated;
grant select, insert on public.finance_entries to authenticated;
create policy "finance admin read with mfa" on public.finance_entries for select to authenticated
  using (public.has_staff_role(array['administrador']));
create policy "finance admin insert with mfa" on public.finance_entries for insert to authenticated
  with check (public.has_staff_role(array['administrador']) and created_by = (select auth.uid()));
create trigger audit_finance_entries after insert on public.finance_entries
  for each row execute function public.log_admin_change();

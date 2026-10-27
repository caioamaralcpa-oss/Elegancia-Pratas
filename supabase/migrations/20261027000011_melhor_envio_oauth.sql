-- Tokens de integração: não expostos a clientes, nem a usuários autenticados.
create table if not exists public.melhor_envio_oauth (
  environment text primary key check (environment = 'sandbox'),
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table public.melhor_envio_oauth enable row level security;
revoke all on public.melhor_envio_oauth from public, anon, authenticated;
grant select, insert, update on public.melhor_envio_oauth to service_role;

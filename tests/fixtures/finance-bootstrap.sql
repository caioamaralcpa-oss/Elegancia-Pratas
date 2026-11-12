-- SOMENTE fixture descartável. Não contém dados pessoais reais.
do $$begin if current_database()<>'finance_fixture' or inet_server_addr()<>'127.0.0.1'::inet then raise exception 'Banco de teste local obrigatório';end if;end$$;
do $begin if not exists(select 1 from pg_roles where rolname='anon')then create role anon;end if;if not exists(select 1 from pg_roles where rolname='authenticated')then create role authenticated;end if;end$;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',coalesce(nullif(current_setting('request.jwt.claim.aal',true),''),'aal1'))$$;
create table auth.users(id uuid primary key,email text);
create table public.orders(id uuid primary key,status text not null,subtotal_cents bigint,shipping_cents bigint);
create table public.admin_users(user_id uuid primary key,role text not null);
create function public.has_staff_role(required_roles text[]) returns boolean language sql stable security definer set search_path='' as $$select auth.jwt()->>'aal'='aal2' and exists(select 1 from public.admin_users where user_id=auth.uid() and role=any(required_roles))$$;
grant usage on schema auth,public to authenticated,anon;
grant execute on function auth.uid(),auth.jwt(),public.has_staff_role(text[]) to authenticated;
insert into auth.users(id) values('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003');
insert into public.admin_users values('00000000-0000-0000-0000-000000000001','administrador');

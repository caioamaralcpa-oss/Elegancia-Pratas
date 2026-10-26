-- Executar somente em ambiente de teste ou por responsável autorizado.
-- Toda alteração abaixo é revertida ao final.
begin;
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-one@example.invalid', '', now(), now(), now()),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-two@example.invalid', '', now(), now(), now());
insert into public.admin_users(user_id, role) values ('11111111-1111-4111-8111-111111111111', 'administrador');
insert into public.orders(user_id, email, subtotal_cents, shipping_cents, total_cents, shipping_address)
values
  ('11111111-1111-4111-8111-111111111111', 'rls-one@example.invalid', 100, 0, 100, '{}'),
  ('22222222-2222-4222-8222-222222222222', 'rls-two@example.invalid', 100, 0, 100, '{}');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1"}', true);
do $$
begin
  if (select count(*) from public.orders) <> 1 then raise exception 'isolamento de pedidos falhou'; end if;
  if public.has_staff_role(array['administrador']) then raise exception 'admin aceito sem MFA'; end if;
  if (select count(*) from public.admin_users) <> 0 then raise exception 'papel visível sem MFA'; end if;
end;
$$;

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal2"}', true);
do $$
begin
  if not public.has_staff_role(array['administrador']) then raise exception 'admin com MFA recusado'; end if;
end;
$$;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","aal":"aal1"}', true);
do $$
begin
  if (select count(*) from public.orders) <> 1 then raise exception 'cliente vê pedidos de terceiro'; end if;
  if (select count(*) from public.orders where user_id = '11111111-1111-4111-8111-111111111111') <> 0 then raise exception 'pedido de terceiro acessível'; end if;
end;
$$;
rollback;

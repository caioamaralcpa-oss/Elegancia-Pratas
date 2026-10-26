-- Exigir segundo fator e aplicar privilégios mínimos às operações administrativas.
alter table public.admin_users add column if not exists role text not null default 'administrador'
  check (role in ('atendente', 'administrador'));

create or replace function public.has_staff_role(required_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select (auth.jwt() ->> 'aal') = 'aal2'
    and exists (
      select 1 from public.admin_users a
      where a.user_id = (select auth.uid()) and a.role = any(required_roles)
    );
$$;
revoke all on function public.has_staff_role(text[]) from public;
grant execute on function public.has_staff_role(text[]) to authenticated;

drop policy if exists "admin read role" on public.admin_users;
create policy "staff read own role with mfa" on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()) and (auth.jwt() ->> 'aal') = 'aal2');

drop policy if exists "admin manage products" on public.products;
create policy "staff read products with mfa" on public.products
  for select to authenticated using (public.has_staff_role(array['atendente','administrador']));
create policy "admin insert products with mfa" on public.products
  for insert to authenticated with check (public.has_staff_role(array['administrador']));
create policy "admin update products with mfa" on public.products
  for update to authenticated using (public.has_staff_role(array['administrador']))
  with check (public.has_staff_role(array['administrador']));
create policy "admin delete products with mfa" on public.products
  for delete to authenticated using (public.has_staff_role(array['administrador']));

drop policy if exists "admin manage variants" on public.product_variants;
create policy "staff read variants with mfa" on public.product_variants
  for select to authenticated using (public.has_staff_role(array['atendente','administrador']));
create policy "admin insert variants with mfa" on public.product_variants
  for insert to authenticated with check (public.has_staff_role(array['administrador']));
create policy "admin update variants with mfa" on public.product_variants
  for update to authenticated using (public.has_staff_role(array['administrador']))
  with check (public.has_staff_role(array['administrador']));
create policy "admin delete variants with mfa" on public.product_variants
  for delete to authenticated using (public.has_staff_role(array['administrador']));

drop policy if exists "admin manage orders" on public.orders;
create policy "staff read orders with mfa" on public.orders
  for select to authenticated using (public.has_staff_role(array['atendente','administrador']));
create policy "staff update orders with mfa" on public.orders
  for update to authenticated using (public.has_staff_role(array['atendente','administrador']))
  with check (public.has_staff_role(array['atendente','administrador']));

drop policy if exists "admin manage order items" on public.order_items;
create policy "staff read order items with mfa" on public.order_items
  for select to authenticated using (public.has_staff_role(array['atendente','administrador']));

drop policy if exists "admin upload product images" on storage.objects;
drop policy if exists "admin update product images" on storage.objects;
drop policy if exists "admin delete product images" on storage.objects;
create policy "admin upload product images with mfa" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.has_staff_role(array['administrador']));
create policy "admin update product images with mfa" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.has_staff_role(array['administrador']))
  with check (bucket_id = 'product-images' and public.has_staff_role(array['administrador']));
create policy "admin delete product images with mfa" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.has_staff_role(array['administrador']));

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  table_name text not null,
  row_id uuid,
  occurred_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
create policy "admin read audit log with mfa" on public.admin_audit_log
  for select to authenticated using (public.has_staff_role(array['administrador']));

create or replace function public.log_admin_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.admin_audit_log(actor_id, action, table_name, row_id)
  values ((select auth.uid()), tg_op, tg_table_name,
    case when tg_op = 'DELETE' then old.id else new.id end);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
revoke all on function public.log_admin_change() from public;
drop trigger if exists audit_products on public.products;
create trigger audit_products after insert or update or delete on public.products
  for each row execute function public.log_admin_change();
drop trigger if exists audit_orders on public.orders;
create trigger audit_orders after insert or update or delete on public.orders
  for each row execute function public.log_admin_change();

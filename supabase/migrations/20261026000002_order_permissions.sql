-- Atendentes podem alterar apenas o andamento e o rastreio; valores e endereços
-- nunca são editados diretamente pela interface administrativa.
revoke update on public.orders from authenticated;
grant update (status, tracking_code) on public.orders to authenticated;

create or replace function public.guard_order_payment_status()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'pago' and old.status is distinct from 'pago'
     and (select auth.role()) is distinct from 'service_role' then
    raise exception 'A confirmação de pagamento exige o serviço de pagamentos';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_order_payment_status() from public;
drop trigger if exists guard_order_payment_status on public.orders;
create trigger guard_order_payment_status before update on public.orders
  for each row execute function public.guard_order_payment_status();

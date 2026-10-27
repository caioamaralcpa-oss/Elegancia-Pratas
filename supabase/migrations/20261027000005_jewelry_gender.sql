-- Gênero comercial escolhido no cadastro, disponível também para o futuro catálogo.
alter table public.products add column gender text not null default 'unissex'
  check (gender in ('masculina', 'feminina', 'unissex'));

-- Versão nova do cadastro. Mantém a função anterior temporariamente para não
-- interromper uma sessão aberta durante o deploy da interface.
create or replace function public.save_jewelry_intake_v2(
  p_id uuid, p_name text, p_description text, p_model text, p_measurements text,
  p_quantity integer, p_unit_cost_cents integer, p_identification_image_path text,
  p_gender text
)
returns table(id uuid, registration_code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.has_staff_role(array['administrador']) then raise exception 'Acesso negado'; end if;
  if p_gender is null or p_gender not in ('masculina', 'feminina', 'unissex') then
    raise exception 'Selecione o gênero da joia';
  end if;
  select saved.id into v_id from public.save_jewelry_intake(
    p_id, p_name, p_description, p_model, p_measurements,
    p_quantity, p_unit_cost_cents, p_identification_image_path
  ) as saved;
  update public.products set gender = p_gender where products.id = v_id;
  return query select products.id, products.registration_code from public.products where products.id = v_id;
end;
$$;
revoke all on function public.save_jewelry_intake_v2(uuid,text,text,text,text,integer,integer,text,text) from public, anon;
grant execute on function public.save_jewelry_intake_v2(uuid,text,text,text,text,integer,integer,text,text) to authenticated;

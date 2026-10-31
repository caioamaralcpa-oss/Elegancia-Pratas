-- Permite corrigir a ficha de uma joia publicada sem refazer seu cadastro.
-- Alterar o custo retira a peça da loja e exige nova precificação.
create or replace function public.save_jewelry_intake_v4(
  p_id uuid, p_name text, p_description text, p_model text, p_measurements text,
  p_quantity integer, p_unit_cost_cents integer, p_identification_image_path text,
  p_gender text
)
returns table(id uuid, registration_code text, active boolean, workflow_stage text)
language plpgsql security definer set search_path = '' as $$
declare
  v_product public.products%rowtype;
  v_old_cost integer;
  v_id uuid;
begin
  if not public.has_staff_role(array['administrador']) then raise exception 'Acesso negado'; end if;
  if nullif(trim(p_name), '') is null or length(trim(p_name)) > 120
     or nullif(trim(p_model), '') is null or length(trim(p_model)) > 80
     or length(coalesce(p_description, '')) > 2000
     or length(coalesce(p_measurements, '')) > 240
     or p_gender is null or p_gender not in ('masculina', 'feminina', 'unissex')
     or p_quantity is null or p_quantity not between 0 and 1000000
     or p_unit_cost_cents is null or p_unit_cost_cents < 0 then
    raise exception 'Confira os dados da joia';
  end if;

  if p_id is not null then
    select * into v_product from public.products where products.id = p_id for update;
    if not found then raise exception 'Joia não encontrada'; end if;
  end if;

  if p_id is null or not v_product.active then
    select saved.id into v_id from public.save_jewelry_intake_v2(
      p_id, p_name, p_description, p_model, p_measurements,
      p_quantity, p_unit_cost_cents, p_identification_image_path, p_gender
    ) as saved;
  else
    select acquisition_cost_cents into v_old_cost from public.jewelry_intake where product_id = p_id for update;
    if not found then raise exception 'Cadastro privado da joia não encontrado'; end if;
    if v_old_cost <> p_unit_cost_cents then
      perform set_config('app.catalog_review', 'allowed', true);
      update public.products set active = false, workflow_stage = 'aguardando_precificacao', price_cents = 0
        where products.id = p_id;
      perform set_config('app.catalog_review', '', true);
      select saved.id into v_id from public.save_jewelry_intake_v2(
        p_id, p_name, p_description, p_model, p_measurements,
        p_quantity, p_unit_cost_cents, p_identification_image_path, p_gender
      ) as saved;
    else
      update public.products set name = trim(p_name), description = nullif(trim(p_description), ''),
        category = trim(p_model), model = trim(p_model), measurements = nullif(trim(p_measurements), ''),
        gender = p_gender, stock = p_quantity where products.id = p_id;
      update public.jewelry_intake set identification_image_path = coalesce(p_identification_image_path, identification_image_path),
        updated_at = now(), updated_by = (select auth.uid()) where product_id = p_id;
      v_id := p_id;
    end if;
  end if;
  return query select products.id, products.registration_code, products.active, products.workflow_stage
    from public.products where products.id = v_id;
end;
$$;
revoke all on function public.save_jewelry_intake_v4(uuid,text,text,text,text,integer,integer,text,text) from public, anon;
grant execute on function public.save_jewelry_intake_v4(uuid,text,text,text,text,integer,integer,text,text) to authenticated;

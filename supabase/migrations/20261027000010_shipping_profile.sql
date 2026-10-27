-- Dados físicos do pacote de uma unidade, necessários antes de cotar frete real.
create or replace function public.save_product_shipping_profile(
  p_product_id uuid, p_weight_grams integer,
  p_width_cm numeric, p_height_cm numeric, p_length_cm numeric
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_staff_role(array['administrador']) then raise exception 'Acesso negado'; end if;
  if p_weight_grams is null or p_weight_grams not between 1 and 30000
     or p_width_cm is null or p_width_cm < 0.1 or p_width_cm > 200
     or p_height_cm is null or p_height_cm < 0.1 or p_height_cm > 200
     or p_length_cm is null or p_length_cm < 0.1 or p_length_cm > 200
     or scale(p_width_cm) > 2 or scale(p_height_cm) > 2 or scale(p_length_cm) > 2 then
    raise exception 'Confira o peso e as dimensões do pacote';
  end if;
  update public.products set weight_grams = p_weight_grams,
    width_cm = p_width_cm, height_cm = p_height_cm, length_cm = p_length_cm
    where id = p_product_id and workflow_stage in ('aguardando_catalogo', 'pronto');
  if not found then raise exception 'Joia não disponível no catálogo'; end if;
end;
$$;
revoke all on function public.save_product_shipping_profile(uuid,integer,numeric,numeric,numeric) from public, anon;
grant execute on function public.save_product_shipping_profile(uuid,integer,numeric,numeric,numeric) to authenticated;

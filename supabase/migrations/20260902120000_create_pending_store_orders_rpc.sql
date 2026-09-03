begin;

alter table public.store_orders
  add column client_request_id uuid;

alter table public.store_orders
  alter column client_request_id set not null,
  add constraint store_orders_client_request_id_key unique (client_request_id);

create or replace function public.create_pending_store_order(
  p_client_request_id uuid,
  p_user_id uuid,
  p_company_id uuid,
  p_first_name text,
  p_last_name text,
  p_business_name text,
  p_email text,
  p_phone text,
  p_country text,
  p_department_state text,
  p_city text,
  p_address text,
  p_address_extra text,
  p_shipping_classification text,
  p_subtotal_cop bigint,
  p_shipping_cop bigint,
  p_total_cop bigint,
  p_product_key text,
  p_product_name text,
  p_model_key text,
  p_model_name text,
  p_quantity integer,
  p_unit_price_cop bigint,
  p_line_total_cop bigint
)
returns table (
  order_id uuid,
  order_reference text,
  subtotal_cop bigint,
  shipping_cop bigint,
  total_cop bigint,
  currency text,
  payment_status text,
  fulfillment_status text,
  product_name text,
  model_name text,
  quantity integer,
  unit_price_cop bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
begin
  insert into public.store_orders (
    client_request_id,
    user_id,
    company_id,
    first_name,
    last_name,
    business_name,
    email,
    phone,
    country,
    department_state,
    city,
    address,
    address_extra,
    shipping_classification,
    subtotal_cop,
    shipping_cop,
    total_cop
  ) values (
    p_client_request_id,
    p_user_id,
    p_company_id,
    p_first_name,
    p_last_name,
    p_business_name,
    p_email,
    p_phone,
    p_country,
    p_department_state,
    p_city,
    p_address,
    p_address_extra,
    p_shipping_classification,
    p_subtotal_cop,
    p_shipping_cop,
    p_total_cop
  )
  on conflict (client_request_id) do nothing
  returning id into v_order_id;

  if v_order_id is null then
    select id
      into v_order_id
      from public.store_orders
      where client_request_id = p_client_request_id;
  else
    insert into public.store_order_items (
      store_order_id,
      product_key,
      product_name,
      model_key,
      model_name,
      personalization_type,
      quantity,
      unit_price_cop,
      line_total_cop
    ) values (
      v_order_id,
      p_product_key,
      p_product_name,
      p_model_key,
      p_model_name,
      'standard',
      p_quantity,
      p_unit_price_cop,
      p_line_total_cop
    );
  end if;

  return query
  select
    store_order.id,
    store_order.order_reference,
    store_order.subtotal_cop,
    store_order.shipping_cop,
    store_order.total_cop,
    store_order.currency,
    store_order.payment_status,
    store_order.fulfillment_status,
    item.product_name,
    item.model_name,
    item.quantity,
    item.unit_price_cop
  from public.store_orders as store_order
  join public.store_order_items as item
    on item.store_order_id = store_order.id
  where store_order.id = v_order_id;
end;
$$;

revoke all on function public.create_pending_store_order(
  uuid, uuid, uuid, text, text, text, text, text, text, text, text,
  text, text, text, bigint, bigint, bigint, text, text, text, text,
  integer, bigint, bigint
) from public, anon, authenticated;

grant execute on function public.create_pending_store_order(
  uuid, uuid, uuid, text, text, text, text, text, text, text, text,
  text, text, text, bigint, bigint, bigint, text, text, text, text,
  integer, bigint, bigint
) to service_role;

commit;

begin;

alter table public.store_orders
  add column if not exists guest_claim_token_hash text,
  add column if not exists guest_claim_created_at timestamptz,
  add column if not exists guest_claim_consumed_at timestamptz;

create unique index if not exists store_orders_guest_claim_token_hash_key
  on public.store_orders (guest_claim_token_hash)
  where guest_claim_token_hash is not null;

create function public.create_pending_store_order(
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
  p_line_total_cop bigint,
  p_terms_accepted boolean,
  p_terms_version text,
  p_guest_claim_token_hash text
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
  v_order record;
begin
  if (p_user_id is null) <> (p_company_id is null) then
    raise exception 'order identity must include both user and company or neither';
  end if;

  if p_user_id is null then
    if p_guest_claim_token_hash !~ '^[a-f0-9]{64}$' then
      raise exception 'guest claim token hash is required';
    end if;
  elsif p_guest_claim_token_hash is not null then
    raise exception 'authenticated orders cannot include a guest claim';
  end if;

  select * into v_order
  from public.create_pending_store_order(
    p_client_request_id, p_user_id, p_company_id,
    p_first_name, p_last_name, p_business_name, p_email, p_phone,
    p_country, p_department_state, p_city, p_address, p_address_extra,
    p_shipping_classification, p_subtotal_cop, p_shipping_cop, p_total_cop,
    p_product_key, p_product_name, p_model_key, p_model_name, p_quantity,
    p_unit_price_cop, p_line_total_cop, p_terms_accepted, p_terms_version
  );

  if p_user_id is null then
    update public.store_orders
      set guest_claim_token_hash = p_guest_claim_token_hash,
          guest_claim_created_at = now(),
          guest_claim_consumed_at = null,
          updated_at = now()
      where id = v_order.order_id
        and user_id is null
        and company_id is null
        and payment_status = 'pending'
        and payment_reference is null;
  end if;

  return query select
    v_order.order_id, v_order.order_reference, v_order.subtotal_cop,
    v_order.shipping_cop, v_order.total_cop, v_order.currency,
    v_order.payment_status, v_order.fulfillment_status, v_order.product_name,
    v_order.model_name, v_order.quantity, v_order.unit_price_cop;
end;
$$;

create or replace function public.resolve_guest_store_order_claim(
  p_order_reference text,
  p_authenticated_user_id uuid,
  p_claim_token_hash text,
  p_provider_transaction_id text
)
returns table (
  outcome text,
  order_id uuid,
  order_reference text,
  audience text,
  email text,
  business_name text,
  company_id uuid,
  payment_status text,
  stock_capture_status text,
  assignment_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.store_orders%rowtype;
  v_authorized boolean := false;
begin
  select * into v_order
  from public.store_orders
  where order_reference = p_order_reference
  for update;

  if not found then
    return query select 'order_not_found'::text, null::uuid, null::text, null::text,
      null::text, null::text, null::uuid, null::text, null::text, null::text;
    return;
  end if;

  if v_order.user_id is not null then
    if p_authenticated_user_id = v_order.user_id then
      v_authorized := true;
    elsif v_order.onboarding_status = 'completed'
      and p_claim_token_hash is not null
      and p_claim_token_hash = v_order.guest_claim_token_hash then
      return query select 'already_claimed'::text, v_order.id, v_order.order_reference,
        'guest'::text, v_order.email, v_order.business_name, v_order.company_id,
        v_order.payment_status, v_order.stock_capture_status, v_order.assignment_status;
      return;
    end if;
  elsif v_order.company_id is null and p_claim_token_hash is not null then
    if p_claim_token_hash = v_order.guest_claim_token_hash then
      v_authorized := true;
    elsif p_provider_transaction_id is not null
      and p_provider_transaction_id = v_order.provider_transaction_id
      and v_order.payment_status = 'paid'
      and v_order.stock_capture_status = 'captured' then
      update public.store_orders
        set guest_claim_token_hash = p_claim_token_hash,
            guest_claim_created_at = now(),
            guest_claim_consumed_at = null,
            updated_at = now()
        where id = v_order.id;
      v_order.guest_claim_token_hash := p_claim_token_hash;
      v_authorized := true;
    end if;
  end if;

  if not v_authorized then
    return query select 'not_authorized'::text, null::uuid, null::text, null::text,
      null::text, null::text, null::uuid, null::text, null::text, null::text;
    return;
  end if;

  return query select
    case when v_order.user_id is null then 'guest_ready'::text else 'authenticated'::text end,
    v_order.id, v_order.order_reference,
    case when v_order.user_id is null then 'guest'::text else 'authenticated'::text end,
    v_order.email, v_order.business_name, v_order.company_id,
    v_order.payment_status, v_order.stock_capture_status, v_order.assignment_status;
end;
$$;

create or replace function public.update_guest_store_order_claim_business_name(
  p_order_reference text,
  p_claim_token_hash text,
  p_business_name text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.store_orders%rowtype;
begin
  select * into v_order from public.store_orders
  where order_reference = p_order_reference for update;

  if not found
    or v_order.user_id is not null
    or v_order.company_id is not null
    or v_order.guest_claim_token_hash is distinct from p_claim_token_hash
    or v_order.payment_status <> 'paid'
    or v_order.stock_capture_status <> 'captured'
    or v_order.assignment_status <> 'pending' then
    return false;
  end if;

  update public.store_orders
    set business_name = p_business_name, updated_at = now()
    where id = v_order.id;
  return true;
end;
$$;

create or replace function public.consume_guest_store_order_claim(
  p_order_reference text,
  p_claim_token_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.store_orders%rowtype;
begin
  select * into v_order from public.store_orders
  where order_reference = p_order_reference for update;

  if not found
    or v_order.guest_claim_token_hash is distinct from p_claim_token_hash
    or v_order.onboarding_status <> 'completed'
    or v_order.assignment_status <> 'assigned' then
    return false;
  end if;

  update public.store_orders
    set guest_claim_consumed_at = coalesce(guest_claim_consumed_at, now()), updated_at = now()
    where id = v_order.id;
  return true;
end;
$$;

revoke all on function public.create_pending_store_order(
  uuid, uuid, uuid, text, text, text, text, text, text, text, text,
  text, text, text, bigint, bigint, bigint, text, text, text, text,
  integer, bigint, bigint, boolean, text, text
) from public, anon, authenticated;
grant execute on function public.create_pending_store_order(
  uuid, uuid, uuid, text, text, text, text, text, text, text, text,
  text, text, text, bigint, bigint, bigint, text, text, text, text,
  integer, bigint, bigint, boolean, text, text
) to service_role;

revoke all on function public.resolve_guest_store_order_claim(text, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.resolve_guest_store_order_claim(text, uuid, text, text)
  to service_role;

revoke all on function public.update_guest_store_order_claim_business_name(text, text, text)
  from public, anon, authenticated;
grant execute on function public.update_guest_store_order_claim_business_name(text, text, text)
  to service_role;

revoke all on function public.consume_guest_store_order_claim(text, text)
  from public, anon, authenticated;
grant execute on function public.consume_guest_store_order_claim(text, text)
  to service_role;

notify pgrst, 'reload schema';

commit;

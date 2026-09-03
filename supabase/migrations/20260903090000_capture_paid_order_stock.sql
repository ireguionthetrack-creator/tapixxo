begin;

alter table public.store_orders
  add column if not exists stock_capture_status text not null default 'not_captured',
  add column if not exists stock_captured_at timestamptz,
  add column if not exists stock_capture_exception text,
  add column if not exists stock_capture_exception_at timestamptz;

alter table public.store_orders
  drop constraint if exists store_orders_stock_capture_status_check,
  add constraint store_orders_stock_capture_status_check
    check (
      stock_capture_status in (
        'not_captured',
        'captured',
        'insufficient_stock',
        'integrity_exception'
      )
    );

create or replace function public.capture_paid_store_order_stock(
  p_order_id uuid
)
returns table (
  outcome text,
  required_units integer,
  captured_units integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.store_orders%rowtype;
  v_required_units integer;
  v_existing_units integer;
  v_selected_unit_ids uuid[];
  v_selected_units integer;
  v_inserted_units integer;
  v_updated_units integer;
begin
  select *
    into v_order
    from public.store_orders
    where id = p_order_id
    for update;

  if not found then
    return query select 'order_not_found'::text, 0, 0;
    return;
  end if;

  if v_order.payment_status <> 'paid' then
    return query select 'payment_not_paid'::text, 0, 0;
    return;
  end if;

  select coalesce(sum(quantity), 0)::integer
    into v_required_units
    from public.store_order_items
    where store_order_id = v_order.id;

  if v_required_units <= 0 then
    update public.store_orders
      set stock_capture_status = 'integrity_exception',
          stock_capture_exception = 'order_has_no_units_to_capture',
          stock_capture_exception_at = now(),
          stock_captured_at = null,
          updated_at = now()
      where id = v_order.id;
    return query select 'integrity_exception'::text, v_required_units, 0;
    return;
  end if;

  select count(*)::integer
    into v_existing_units
    from public.store_order_units
    where store_order_id = v_order.id;

  if v_existing_units = v_required_units then
    update public.store_orders
      set stock_capture_status = 'captured',
          stock_captured_at = coalesce(stock_captured_at, now()),
          stock_capture_exception = null,
          stock_capture_exception_at = null,
          updated_at = now()
      where id = v_order.id;
    return query select 'already_captured'::text, v_required_units, v_existing_units;
    return;
  end if;

  if v_existing_units <> 0 then
    update public.store_orders
      set stock_capture_status = 'integrity_exception',
          stock_capture_exception = 'partial_store_order_units_detected',
          stock_capture_exception_at = now(),
          stock_captured_at = null,
          updated_at = now()
      where id = v_order.id;
    return query select 'integrity_exception'::text, v_required_units, v_existing_units;
    return;
  end if;

  select coalesce(array_agg(selected.id order by selected.created_at, selected.id), '{}'::uuid[])
    into v_selected_unit_ids
    from (
      select iu.id, iu.created_at
      from public.inventory_units as iu
      join public.codes as c
        on c.id = iu.code_id
      where iu.status = 'available'
        and c.company_id is null
        and c.group_id is null
      order by iu.created_at, iu.id
      for update of iu, c skip locked
      limit v_required_units
    ) as selected;

  v_selected_units := coalesce(array_length(v_selected_unit_ids, 1), 0);

  if v_selected_units <> v_required_units then
    update public.store_orders
      set stock_capture_status = 'insufficient_stock',
          stock_capture_exception = 'insufficient_eligible_inventory',
          stock_capture_exception_at = now(),
          stock_captured_at = null,
          updated_at = now()
      where id = v_order.id;
    return query select 'insufficient_stock'::text, v_required_units, 0;
    return;
  end if;

  with item_slots as (
    select
      item.id as store_order_item_id,
      row_number() over (order by item.created_at, item.id, slot.position) as slot_number
    from public.store_order_items as item
    cross join lateral generate_series(1, item.quantity) as slot(position)
    where item.store_order_id = v_order.id
  ),
  selected_units as (
    select
      iu.id as inventory_unit_id,
      c.code,
      row_number() over (order by iu.created_at, iu.id) as slot_number
    from public.inventory_units as iu
    join public.codes as c
      on c.id = iu.code_id
    where iu.id = any(v_selected_unit_ids)
  )
  insert into public.store_order_units (
    store_order_id,
    store_order_item_id,
    inventory_unit_id,
    code_snapshot
  )
  select
    v_order.id,
    item_slots.store_order_item_id,
    selected_units.inventory_unit_id,
    selected_units.code
  from item_slots
  join selected_units
    on selected_units.slot_number = item_slots.slot_number;

  get diagnostics v_inserted_units = row_count;
  if v_inserted_units <> v_required_units then
    raise exception 'stock capture inserted % units for order %, expected %',
      v_inserted_units, v_order.id, v_required_units;
  end if;

  update public.inventory_units
    set status = 'processing',
        processing_at = now()
    where id = any(v_selected_unit_ids)
      and status = 'available';

  get diagnostics v_updated_units = row_count;
  if v_updated_units <> v_required_units then
    raise exception 'stock capture transitioned % units for order %, expected %',
      v_updated_units, v_order.id, v_required_units;
  end if;

  update public.store_orders
    set stock_capture_status = 'captured',
        stock_captured_at = now(),
        stock_capture_exception = null,
        stock_capture_exception_at = null,
        updated_at = now()
    where id = v_order.id;

  return query select 'captured'::text, v_required_units, v_required_units;
end;
$$;

create or replace function public.apply_wompi_transaction_update(
  p_payment_reference text,
  p_provider_transaction_id text,
  p_amount_in_cents bigint,
  p_currency text,
  p_wompi_status text
)
returns table (
  outcome text,
  payment_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.store_orders%rowtype;
  v_existing_order_id uuid;
  v_stock_capture_outcome text;
begin
  select *
    into v_order
    from public.store_orders
    where payment_provider = 'wompi'
      and payment_reference = p_payment_reference
    for update;

  if not found then
    return query select 'order_not_found'::text, null::text;
    return;
  end if;

  if p_provider_transaction_id is null or btrim(p_provider_transaction_id) = '' then
    return query select 'invalid_transaction_id'::text, v_order.payment_status;
    return;
  end if;

  if p_amount_in_cents is null
    or p_amount_in_cents < 0
    or v_order.total_cop > 92233720368547758
    or p_amount_in_cents <> v_order.total_cop * 100 then
    return query select 'amount_mismatch'::text, v_order.payment_status;
    return;
  end if;

  if p_currency <> v_order.currency then
    return query select 'currency_mismatch'::text, v_order.payment_status;
    return;
  end if;

  select id
    into v_existing_order_id
    from public.store_orders
    where payment_provider = 'wompi'
      and provider_transaction_id = p_provider_transaction_id
      and id <> v_order.id
    limit 1;

  if v_existing_order_id is not null then
    return query select 'transaction_conflict'::text, v_order.payment_status;
    return;
  end if;

  if v_order.provider_transaction_id is not null
    and v_order.provider_transaction_id <> p_provider_transaction_id then
    return query select 'transaction_contradiction'::text, v_order.payment_status;
    return;
  end if;

  if v_order.payment_status = 'paid' then
    if p_wompi_status = 'APPROVED' then
      select capture.outcome
        into v_stock_capture_outcome
        from public.capture_paid_store_order_stock(v_order.id) as capture;

      if v_stock_capture_outcome = 'captured'
        or v_stock_capture_outcome = 'already_captured' then
        return query select 'idempotent_paid'::text, 'paid'::text;
      end if;

      if v_stock_capture_outcome = 'insufficient_stock'
        or v_stock_capture_outcome = 'integrity_exception' then
        return query select 'paid_stock_exception'::text, 'paid'::text;
      end if;

      raise exception 'unexpected stock capture outcome % for paid order %',
        v_stock_capture_outcome, v_order.id;
    end if;

    return query select 'transition_rejected'::text, 'paid'::text;
    return;
  end if;

  if v_order.payment_status = 'failed' then
    if p_wompi_status in ('DECLINED', 'VOIDED', 'ERROR') then
      update public.store_orders
        set provider_transaction_id = p_provider_transaction_id,
            updated_at = now()
        where id = v_order.id;
      return query select 'idempotent_failed'::text, 'failed'::text;
      return;
    end if;

    return query select 'transition_rejected'::text, 'failed'::text;
    return;
  end if;

  if v_order.payment_status <> 'pending' then
    return query select 'transition_rejected'::text, v_order.payment_status;
    return;
  end if;

  if p_wompi_status = 'APPROVED' then
    update public.store_orders
      set payment_status = 'paid',
          paid_at = now(),
          provider_transaction_id = p_provider_transaction_id,
          updated_at = now()
      where id = v_order.id;

    select capture.outcome
      into v_stock_capture_outcome
      from public.capture_paid_store_order_stock(v_order.id) as capture;

    if v_stock_capture_outcome = 'captured'
      or v_stock_capture_outcome = 'already_captured' then
      return query select 'paid'::text, 'paid'::text;
    end if;

    if v_stock_capture_outcome = 'insufficient_stock'
      or v_stock_capture_outcome = 'integrity_exception' then
      return query select 'paid_stock_exception'::text, 'paid'::text;
    end if;

    raise exception 'unexpected stock capture outcome % for paid order %',
      v_stock_capture_outcome, v_order.id;
  end if;

  if p_wompi_status in ('DECLINED', 'VOIDED', 'ERROR') then
    update public.store_orders
      set payment_status = 'failed',
          paid_at = null,
          provider_transaction_id = p_provider_transaction_id,
          updated_at = now()
      where id = v_order.id;
    return query select 'failed'::text, 'failed'::text;
    return;
  end if;

  return query select 'ignored_status'::text, 'pending'::text;
end;
$$;

revoke all on function public.capture_paid_store_order_stock(uuid)
  from public, anon, authenticated;

grant execute on function public.capture_paid_store_order_stock(uuid)
  to service_role;

revoke all on function public.apply_wompi_transaction_update(text, text, bigint, text, text)
  from public, anon, authenticated;

grant execute on function public.apply_wompi_transaction_update(text, text, bigint, text, text)
  to service_role;

notify pgrst, 'reload schema';

commit;

begin;

create or replace function public.apply_wompi_transaction_update(
  p_payment_reference text,
  p_provider_transaction_id text,
  p_amount_in_cents bigint,
  p_currency text,
  p_wompi_status text
)
returns table (outcome text, payment_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.store_orders%rowtype;
  v_existing_order_id uuid;
  v_stock_capture_outcome text;
begin
  select * into v_order
    from public.store_orders
    where payment_provider = 'wompi' and payment_reference = p_payment_reference
    for update;

  if not found then
    return query select 'order_not_found'::text, null::text;
    return;
  end if;

  if p_provider_transaction_id is null or btrim(p_provider_transaction_id) = '' then
    return query select 'invalid_transaction_id'::text, v_order.payment_status;
    return;
  end if;

  if p_amount_in_cents is null or p_amount_in_cents < 0
    or v_order.total_cop > 92233720368547758
    or p_amount_in_cents <> v_order.total_cop * 100 then
    return query select 'amount_mismatch'::text, v_order.payment_status;
    return;
  end if;

  if p_currency <> v_order.currency then
    return query select 'currency_mismatch'::text, v_order.payment_status;
    return;
  end if;

  select id into v_existing_order_id
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
      select capture.outcome into v_stock_capture_outcome
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
        set provider_transaction_id = p_provider_transaction_id, updated_at = now()
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
      set payment_status = 'paid', paid_at = now(),
          provider_transaction_id = p_provider_transaction_id, updated_at = now()
      where id = v_order.id;

    select capture.outcome into v_stock_capture_outcome
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
      set payment_status = 'failed', paid_at = null,
          provider_transaction_id = p_provider_transaction_id, updated_at = now()
      where id = v_order.id;
    return query select 'failed'::text, 'failed'::text;
    return;
  end if;

  return query select 'ignored_status'::text, 'pending'::text;
end;
$$;

revoke all on function public.apply_wompi_transaction_update(text, text, bigint, text, text)
  from public, anon, authenticated;

grant execute on function public.apply_wompi_transaction_update(text, text, bigint, text, text)
  to service_role;

notify pgrst, 'reload schema';

commit;

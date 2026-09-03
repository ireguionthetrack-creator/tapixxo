begin;

-- Marca técnica: permite reutilizar exactamente un grupo de Store por empresa
-- sin depender de su nombre visible ni crear duplicados por concurrencia.
alter table public.code_groups
  add column if not exists is_store_purchase_group boolean not null default false;

create unique index if not exists code_groups_store_purchase_group_company_key
  on public.code_groups (company_id)
  where is_store_purchase_group;

alter table public.store_orders
  add column if not exists assignment_status text not null default 'pending',
  add column if not exists assignment_completed_at timestamptz,
  add column if not exists assignment_exception text,
  add column if not exists assignment_exception_at timestamptz;

alter table public.store_orders
  drop constraint if exists store_orders_assignment_status_check,
  add constraint store_orders_assignment_status_check
    check (assignment_status in ('pending', 'assigned', 'needs_review'));

create or replace function public.finalize_paid_existing_customer_order(
  p_order_id uuid
)
returns table (
  outcome text,
  assignment_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.store_orders%rowtype;
  v_required_units integer;
  v_order_unit_count integer;
  v_valid_unit_count integer;
  v_store_group_id uuid;
  v_assigned_unit_count integer;
  v_assigned_valid_count integer;
  v_updated_codes integer;
  v_updated_units integer;
begin
  select *
    into v_order
    from public.store_orders
    where id = p_order_id
    for update;

  if not found then
    return query select 'order_not_found'::text, null::text;
    return;
  end if;

  if v_order.payment_status <> 'paid'
    or v_order.stock_capture_status <> 'captured' then
    return query select 'stock_not_captured'::text, v_order.assignment_status;
    return;
  end if;

  -- Invitados: el pago y la captura son correctos, pero el onboarding queda
  -- explícitamente pendiente para una fase posterior.
  if v_order.user_id is null or v_order.company_id is null then
    return query select 'guest_pending'::text, v_order.assignment_status;
    return;
  end if;

  if v_order.assignment_status = 'needs_review' then
    return query select 'needs_review'::text, 'needs_review'::text;
    return;
  end if;

  -- La relación profile -> company y la existencia de la empresa se validan
  -- desde los datos persistidos del pedido, nunca desde el navegador.
  perform 1
    from public.profiles as profile
    join public.companies as company
      on company.id = profile.company_id
    where profile.id = v_order.user_id
      and profile.company_id = v_order.company_id;

  if not found then
    update public.store_orders
      set assignment_status = 'needs_review',
          assignment_completed_at = null,
          assignment_exception = 'profile_company_mismatch_or_missing',
          assignment_exception_at = now(),
          updated_at = now()
      where id = v_order.id;
    return query select 'needs_review'::text, 'needs_review'::text;
    return;
  end if;

  select coalesce(sum(quantity), 0)::integer
    into v_required_units
    from public.store_order_items
    where store_order_id = v_order.id;

  if v_required_units <= 0 then
    update public.store_orders
      set assignment_status = 'needs_review',
          assignment_completed_at = null,
          assignment_exception = 'order_has_no_units_to_assign',
          assignment_exception_at = now(),
          updated_at = now()
      where id = v_order.id;
    return query select 'needs_review'::text, 'needs_review'::text;
    return;
  end if;

  -- Un pedido ya finalizado no cambia assigned_at ni vuelve a tocar códigos.
  if v_order.assignment_status = 'assigned' then
    select
      count(*)::integer,
      count(*) filter (
        where locked_unit.status = 'assigned'
          and locked_unit.assigned_at is not null
          and locked_unit.code_company_id = v_order.company_id
          and locked_unit.code_group_id is not null
          and locked_unit.group_company_id = v_order.company_id
          and locked_unit.is_store_purchase_group
      )::integer
      into v_assigned_unit_count, v_assigned_valid_count
    from (
      select
        order_unit.id,
        inventory_unit.status,
        inventory_unit.assigned_at,
        code.company_id as code_company_id,
        code.group_id as code_group_id,
        code_group.company_id as group_company_id,
        code_group.is_store_purchase_group
      from public.store_order_units as order_unit
      join public.inventory_units as inventory_unit
        on inventory_unit.id = order_unit.inventory_unit_id
      join public.codes as code
        on code.id = inventory_unit.code_id
      left join public.code_groups as code_group
        on code_group.id = code.group_id
      where order_unit.store_order_id = v_order.id
      order by order_unit.id
      for update of order_unit, inventory_unit, code
    ) as locked_unit;

    if v_assigned_unit_count = v_required_units
      and v_assigned_valid_count = v_required_units then
      return query select 'idempotent_assigned'::text, 'assigned'::text;
      return;
    end if;

    update public.store_orders
      set assignment_status = 'needs_review',
          assignment_completed_at = null,
          assignment_exception = 'assigned_order_integrity_mismatch',
          assignment_exception_at = now(),
          updated_at = now()
      where id = v_order.id;
    return query select 'needs_review'::text, 'needs_review'::text;
    return;
  end if;

  -- Bloquea exactamente las unidades ya capturadas para el pedido y sus
  -- códigos. No busca ni consume unidades available.
  select
    count(*)::integer,
    count(*) filter (
      where locked_unit.status = 'processing'
        and locked_unit.code_company_id is null
        and locked_unit.code_group_id is null
    )::integer
    into v_order_unit_count, v_valid_unit_count
  from (
    select
      order_unit.id,
      inventory_unit.status,
      code.company_id as code_company_id,
      code.group_id as code_group_id
    from public.store_order_units as order_unit
    join public.inventory_units as inventory_unit
      on inventory_unit.id = order_unit.inventory_unit_id
    join public.codes as code
      on code.id = inventory_unit.code_id
    where order_unit.store_order_id = v_order.id
    order by order_unit.id
    for update of order_unit, inventory_unit, code
  ) as locked_unit;

  if v_order_unit_count <> v_required_units
    or v_valid_unit_count <> v_required_units then
    update public.store_orders
      set assignment_status = 'needs_review',
          assignment_completed_at = null,
          assignment_exception = 'captured_unit_integrity_mismatch',
          assignment_exception_at = now(),
          updated_at = now()
      where id = v_order.id;
    return query select 'needs_review'::text, 'needs_review'::text;
    return;
  end if;

  -- La restricción parcial garantiza un único grupo de compras Store por
  -- empresa incluso ante ejecuciones concurrentes.
  insert into public.code_groups (
    company_id,
    name,
    description,
    is_store_purchase_group
  ) values (
    v_order.company_id,
    'Placas compradas',
    'Grupo automático para placas adquiridas en la Store.',
    true
  )
  on conflict (company_id) where is_store_purchase_group do nothing
  returning id into v_store_group_id;

  if v_store_group_id is null then
    select id
      into v_store_group_id
      from public.code_groups
      where company_id = v_order.company_id
        and is_store_purchase_group
      for update;
  end if;

  if v_store_group_id is null then
    raise exception 'could not resolve Store group for company %', v_order.company_id;
  end if;

  -- company_id y group_id se actualizan en la misma sentencia para respetar
  -- la FK compuesta de codes.
  update public.codes as code
    set company_id = v_order.company_id,
        group_id = v_store_group_id,
        updated_at = now()
    from public.store_order_units as order_unit
    join public.inventory_units as inventory_unit
      on inventory_unit.id = order_unit.inventory_unit_id
    where order_unit.store_order_id = v_order.id
      and code.id = inventory_unit.code_id;

  get diagnostics v_updated_codes = row_count;
  if v_updated_codes <> v_required_units then
    raise exception 'assignment updated % codes for order %, expected %',
      v_updated_codes, v_order.id, v_required_units;
  end if;

  update public.inventory_units as inventory_unit
    set status = 'assigned',
        processing_at = null,
        assigned_at = now()
    from public.store_order_units as order_unit
    where order_unit.store_order_id = v_order.id
      and inventory_unit.id = order_unit.inventory_unit_id;

  get diagnostics v_updated_units = row_count;
  if v_updated_units <> v_required_units then
    raise exception 'assignment transitioned % units for order %, expected %',
      v_updated_units, v_order.id, v_required_units;
  end if;

  update public.store_orders
    set assignment_status = 'assigned',
        assignment_completed_at = now(),
        assignment_exception = null,
        assignment_exception_at = null,
        updated_at = now()
    where id = v_order.id;

  return query select 'assigned'::text, 'assigned'::text;
end;
$$;

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
      perform 1 from public.capture_paid_store_order_stock(v_order.id);
      return query
      select finalization.outcome, 'paid'::text
      from public.finalize_paid_existing_customer_order(v_order.id) as finalization;
      return;
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

    perform 1 from public.capture_paid_store_order_stock(v_order.id);
    return query
    select finalization.outcome, 'paid'::text
    from public.finalize_paid_existing_customer_order(v_order.id) as finalization;
    return;
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

revoke all on function public.finalize_paid_existing_customer_order(uuid)
  from public, anon, authenticated;

grant execute on function public.finalize_paid_existing_customer_order(uuid)
  to service_role;

revoke all on function public.apply_wompi_transaction_update(text, text, bigint, text, text)
  from public, anon, authenticated;

grant execute on function public.apply_wompi_transaction_update(text, text, bigint, text, text)
  to service_role;

notify pgrst, 'reload schema';

commit;

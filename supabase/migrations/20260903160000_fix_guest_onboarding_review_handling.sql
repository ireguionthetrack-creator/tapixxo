begin;

create or replace function public.complete_guest_order_onboarding(
  p_order_id uuid,
  p_auth_user_id uuid
)
returns table (
  outcome text,
  onboarding_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.store_orders%rowtype;
  v_company_id uuid;
  v_company_name text;
  v_finalization_outcome text;
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

  if v_order.onboarding_status = 'needs_review' then
    return query select 'needs_review'::text, 'needs_review'::text;
    return;
  end if;

  if v_order.onboarding_status = 'completed' then
    perform 1
      from public.profiles as profile
      join public.companies as company
        on company.id = profile.company_id
      where profile.id = v_order.user_id
        and profile.company_id = v_order.company_id
        and profile.role = 'company';

    if found and v_order.assignment_status = 'assigned' then
      return query select 'idempotent_completed'::text, 'completed'::text;
      return;
    end if;

    update public.store_orders
      set onboarding_status = 'needs_review',
          onboarding_exception_reason = 'onboarding_completed_integrity_mismatch',
          assignment_status = 'needs_review',
          assignment_completed_at = null,
          assignment_exception = 'onboarding_completed_integrity_mismatch',
          assignment_exception_at = now(),
          updated_at = now()
      where id = v_order.id;
    return query select 'needs_review'::text, 'needs_review'::text;
    return;
  end if;

  if v_order.onboarding_status <> 'processing'
    or v_order.payment_status <> 'paid'
    or v_order.stock_capture_status <> 'captured'
    or v_order.assignment_status <> 'pending'
    or v_order.user_id is not null
    or v_order.company_id is not null
    or v_order.onboarding_auth_user_id is null
    or v_order.onboarding_auth_user_id <> p_auth_user_id then
    update public.store_orders
      set onboarding_status = 'needs_review',
          onboarding_exception_reason = 'onboarding_completion_ineligible',
          assignment_status = 'needs_review',
          assignment_completed_at = null,
          assignment_exception = 'onboarding_completion_ineligible',
          assignment_exception_at = now(),
          updated_at = now()
      where id = v_order.id;
    return query select 'needs_review'::text, 'needs_review'::text;
    return;
  end if;

  perform 1
    from public.profiles
    where id = p_auth_user_id
    for update;

  if found then
    update public.store_orders
      set onboarding_status = 'needs_review',
          onboarding_exception_reason = 'onboarding_auth_user_profile_exists',
          assignment_status = 'needs_review',
          assignment_completed_at = null,
          assignment_exception = 'onboarding_auth_user_profile_exists',
          assignment_exception_at = now(),
          updated_at = now()
      where id = v_order.id;
    return query select 'needs_review'::text, 'needs_review'::text;
    return;
  end if;

  v_company_name := nullif(btrim(coalesce(v_order.business_name, '')), '');
  if v_company_name is null then
    v_company_name := nullif(btrim(concat_ws(' ', v_order.first_name, v_order.last_name)), '');
  end if;
  if v_company_name is null then
    v_company_name := 'Cliente ' || v_order.order_reference;
  end if;

  insert into public.companies (name)
  values (v_company_name)
  returning id into v_company_id;

  insert into public.profiles (id, company_id, role)
  values (p_auth_user_id, v_company_id, 'company');

  update public.store_orders
    set user_id = p_auth_user_id,
        company_id = v_company_id,
        updated_at = now()
    where id = v_order.id;

  select finalization.outcome
    into v_finalization_outcome
    from public.finalize_paid_existing_customer_order(v_order.id) as finalization;

  if v_finalization_outcome not in ('assigned', 'idempotent_assigned') then
    update public.store_orders
      set onboarding_status = 'needs_review',
          onboarding_exception_reason = coalesce(assignment_exception, 'onboarding_assignment_unresolved'),
          updated_at = now()
      where id = v_order.id;
    return query select 'needs_review'::text, 'needs_review'::text;
    return;
  end if;

  update public.store_orders
    set onboarding_status = 'completed',
        onboarding_completed_at = now(),
        onboarding_exception_reason = null,
        updated_at = now()
    where id = v_order.id;

  return query select 'completed'::text, 'completed'::text;
end;
$$;

revoke all on function public.complete_guest_order_onboarding(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.complete_guest_order_onboarding(uuid, uuid)
  to service_role;

notify pgrst, 'reload schema';

commit;

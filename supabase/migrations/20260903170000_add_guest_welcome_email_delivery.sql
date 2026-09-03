begin;

alter table public.store_orders
  add column if not exists welcome_email_status text not null default 'pending',
  add column if not exists welcome_email_started_at timestamptz,
  add column if not exists welcome_email_sent_at timestamptz,
  add column if not exists welcome_email_last_error text,
  add column if not exists welcome_email_provider_id text;

alter table public.store_orders
  drop constraint if exists store_orders_welcome_email_status_check,
  add constraint store_orders_welcome_email_status_check
    check (welcome_email_status in ('pending', 'processing', 'sent', 'failed'));

create or replace function public.begin_guest_welcome_email(
  p_order_id uuid
)
returns table (
  outcome text,
  order_id uuid,
  recipient_email text,
  recipient_first_name text,
  onboarding_auth_user_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.store_orders%rowtype;
  v_email text;
begin
  select *
    into v_order
    from public.store_orders
    where id = p_order_id
    for update;

  if not found then
    return query select 'order_not_found'::text, null::uuid, null::text, null::text, null::uuid;
    return;
  end if;

  -- onboarding_auth_user_id solo se registra para la identidad creada por el
  -- flujo de invitado; evita enviar este correo a clientes ya existentes.
  if v_order.payment_status <> 'paid'
    or v_order.stock_capture_status <> 'captured'
    or v_order.onboarding_status <> 'completed'
    or v_order.assignment_status <> 'assigned'
    or v_order.user_id is null
    or v_order.company_id is null
    or v_order.onboarding_auth_user_id is null
    or v_order.onboarding_auth_user_id <> v_order.user_id then
    return query select 'not_eligible'::text, v_order.id, null::text, null::text, null::uuid;
    return;
  end if;

  if v_order.welcome_email_status = 'sent' then
    return query select 'already_sent'::text, v_order.id, null::text, null::text, v_order.onboarding_auth_user_id;
    return;
  end if;

  -- Si el proveedor ya pudo haber aceptado el correo pero el proceso murió
  -- antes de marcarlo como sent, no repetimos un enlace potencialmente válido.
  if v_order.welcome_email_status = 'processing' then
    return query select 'in_progress'::text, v_order.id, null::text, null::text, v_order.onboarding_auth_user_id;
    return;
  end if;

  v_email := lower(btrim(v_order.email));
  if v_email = '' or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    update public.store_orders
      set welcome_email_status = 'failed',
          welcome_email_last_error = 'welcome_email_invalid_recipient',
          updated_at = now()
      where id = v_order.id;
    return query select 'failed'::text, v_order.id, null::text, null::text, v_order.onboarding_auth_user_id;
    return;
  end if;

  update public.store_orders
    set welcome_email_status = 'processing',
        welcome_email_started_at = now(),
        welcome_email_last_error = null,
        updated_at = now()
    where id = v_order.id;

  return query select
    'ready'::text,
    v_order.id,
    v_email,
    nullif(btrim(coalesce(v_order.first_name, '')), ''),
    v_order.onboarding_auth_user_id;
end;
$$;

create or replace function public.mark_guest_welcome_email_sent(
  p_order_id uuid,
  p_provider_id text
)
returns table (outcome text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.store_orders%rowtype;
begin
  select *
    into v_order
    from public.store_orders
    where id = p_order_id
    for update;

  if not found then
    return query select 'order_not_found'::text;
    return;
  end if;

  if v_order.welcome_email_status = 'sent' then
    return query select 'already_sent'::text;
    return;
  end if;

  if v_order.welcome_email_status <> 'processing' then
    return query select 'not_processing'::text;
    return;
  end if;

  update public.store_orders
    set welcome_email_status = 'sent',
        welcome_email_sent_at = now(),
        welcome_email_last_error = null,
        welcome_email_provider_id = nullif(left(btrim(p_provider_id), 255), ''),
        updated_at = now()
    where id = v_order.id;

  return query select 'sent'::text;
end;
$$;

create or replace function public.mark_guest_welcome_email_failed(
  p_order_id uuid,
  p_reason text
)
returns table (outcome text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.store_orders%rowtype;
  v_reason text;
begin
  select *
    into v_order
    from public.store_orders
    where id = p_order_id
    for update;

  if not found then
    return query select 'order_not_found'::text;
    return;
  end if;

  if v_order.welcome_email_status = 'sent' then
    return query select 'already_sent'::text;
    return;
  end if;

  v_reason := left(nullif(btrim(p_reason), ''), 120);
  if v_reason is null then
    v_reason := 'welcome_email_delivery_failed';
  end if;

  update public.store_orders
    set welcome_email_status = 'failed',
        welcome_email_last_error = v_reason,
        updated_at = now()
    where id = v_order.id;

  return query select 'failed'::text;
end;
$$;

revoke all on function public.begin_guest_welcome_email(uuid)
  from public, anon, authenticated;
grant execute on function public.begin_guest_welcome_email(uuid)
  to service_role;

revoke all on function public.mark_guest_welcome_email_sent(uuid, text)
  from public, anon, authenticated;
grant execute on function public.mark_guest_welcome_email_sent(uuid, text)
  to service_role;

revoke all on function public.mark_guest_welcome_email_failed(uuid, text)
  from public, anon, authenticated;
grant execute on function public.mark_guest_welcome_email_failed(uuid, text)
  to service_role;

notify pgrst, 'reload schema';

commit;

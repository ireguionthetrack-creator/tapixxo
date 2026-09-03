begin;

grant select (
  id,
  order_reference,
  total_cop,
  currency,
  payment_status,
  payment_provider,
  payment_reference
) on table public.store_orders to service_role;

grant update (
  payment_provider,
  payment_reference,
  updated_at
) on table public.store_orders to service_role;

commit;

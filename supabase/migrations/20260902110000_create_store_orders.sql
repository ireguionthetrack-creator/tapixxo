begin;

create table public.store_orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  order_reference text generated always as (
    'TPX-' || lpad(order_number::text, 6, '0')
  ) stored unique,

  user_id uuid references auth.users(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,

  first_name text not null,
  last_name text not null,
  business_name text,
  email text not null,
  phone text not null,

  country text not null,
  department_state text not null,
  city text not null,
  address text not null,
  address_extra text,
  shipping_classification text not null
    check (shipping_classification in ('cartagena', 'colombia', 'international')),

  subtotal_cop bigint not null check (subtotal_cop >= 0),
  shipping_cop bigint not null check (shipping_cop >= 0),
  total_cop bigint not null
    check (total_cop = subtotal_cop + shipping_cop),
  currency text not null default 'COP' check (currency = 'COP'),

  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  paid_at timestamptz,
  fulfillment_status text not null default 'pending'
    check (
      fulfillment_status in (
        'pending',
        'processing',
        'preparing',
        'shipped',
        'delivered',
        'cancelled'
      )
    ),

  payment_provider text,
  payment_reference text,
  provider_transaction_id text,
  internal_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint store_orders_paid_at_check check (
    (payment_status in ('pending', 'failed') and paid_at is null)
    or
    (payment_status in ('paid', 'refunded') and paid_at is not null)
  )
);

create table public.store_order_items (
  id uuid primary key default gen_random_uuid(),
  store_order_id uuid not null
    references public.store_orders(id) on delete restrict,

  product_key text not null,
  product_name text not null,
  model_key text not null,
  model_name text not null,
  personalization_type text not null default 'standard'
    check (personalization_type = 'standard'),
  quantity integer not null check (quantity > 0),
  unit_price_cop bigint not null check (unit_price_cop >= 0),
  line_total_cop bigint not null
    check (line_total_cop = quantity::bigint * unit_price_cop),

  created_at timestamptz not null default now(),

  constraint store_order_items_id_order_key unique (id, store_order_id)
);

create table public.store_order_units (
  id uuid primary key default gen_random_uuid(),
  store_order_id uuid not null
    references public.store_orders(id) on delete restrict,
  store_order_item_id uuid not null,
  inventory_unit_id uuid not null
    references public.inventory_units(id) on delete restrict,
  code_snapshot text not null,
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint store_order_units_inventory_unit_id_key unique (inventory_unit_id),
  constraint store_order_units_item_order_fkey
    foreign key (store_order_item_id, store_order_id)
    references public.store_order_items(id, store_order_id)
    on delete restrict
);

create index store_orders_created_at_idx
  on public.store_orders (created_at desc);

create index store_orders_user_id_idx
  on public.store_orders (user_id)
  where user_id is not null;

create index store_orders_company_id_idx
  on public.store_orders (company_id)
  where company_id is not null;

create index store_orders_statuses_created_at_idx
  on public.store_orders (payment_status, fulfillment_status, created_at desc);

create unique index store_orders_provider_payment_reference_key
  on public.store_orders (payment_provider, payment_reference)
  where payment_provider is not null and payment_reference is not null;

create unique index store_orders_provider_transaction_id_key
  on public.store_orders (payment_provider, provider_transaction_id)
  where payment_provider is not null and provider_transaction_id is not null;

create index store_order_items_order_id_idx
  on public.store_order_items (store_order_id);

create index store_order_units_order_id_idx
  on public.store_order_units (store_order_id);

create index store_order_units_order_item_id_idx
  on public.store_order_units (store_order_item_id);

alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;
alter table public.store_order_units enable row level security;

revoke all on table public.store_orders from anon, authenticated;
revoke all on table public.store_order_items from anon, authenticated;
revoke all on table public.store_order_units from anon, authenticated;

commit;

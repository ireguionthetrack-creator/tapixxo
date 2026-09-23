begin;

create table if not exists public.waiter_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists waiter_push_subscriptions_company_enabled_idx
  on public.waiter_push_subscriptions (company_id, enabled);

alter table public.waiter_push_subscriptions enable row level security;
revoke all on table public.waiter_push_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on table public.waiter_push_subscriptions to service_role;

commit;

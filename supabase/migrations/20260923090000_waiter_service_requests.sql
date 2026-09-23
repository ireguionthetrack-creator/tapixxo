begin;

create table if not exists public.waiter_service_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code_id uuid not null references public.codes(id) on delete restrict,
  plate_code text not null check (plate_code ~ '^[A-Z]+[1-9][0-9]*$'),
  table_label text not null check (char_length(trim(table_label)) between 1 and 120),
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  check (
    (status = 'pending' and resolved_at is null and resolved_by is null)
    or (status = 'resolved' and resolved_at is not null)
  )
);

create index if not exists waiter_service_requests_company_status_requested_idx
  on public.waiter_service_requests (company_id, status, requested_at desc);

alter table public.waiter_service_requests enable row level security;
revoke all on table public.waiter_service_requests from public, anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update on table public.waiter_service_requests to service_role;

commit;

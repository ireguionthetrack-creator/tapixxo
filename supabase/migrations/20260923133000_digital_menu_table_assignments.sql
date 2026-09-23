begin;

create table if not exists public.digital_menu_table_assignments (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.digital_menus(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  code_id uuid not null references public.codes(id) on delete cascade,
  table_label text not null check (char_length(trim(table_label)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (menu_id, code_id)
);

create index if not exists digital_menu_table_assignments_company_code_idx
  on public.digital_menu_table_assignments (company_id, code_id);

drop trigger if exists digital_menu_table_assignments_touch_updated_at on public.digital_menu_table_assignments;
create trigger digital_menu_table_assignments_touch_updated_at
before update on public.digital_menu_table_assignments
for each row execute function public.digital_menu_touch_updated_at();

alter table public.digital_menu_table_assignments enable row level security;
revoke all on table public.digital_menu_table_assignments from public, anon, authenticated;
grant all privileges on table public.digital_menu_table_assignments to service_role;

commit;

-- Módulo premium mínimo de Menú Digital. Es independiente de códigos, QR/NFC,
-- horarios y redirecciones existentes.

alter table public.companies
  add column if not exists menu_digital_enabled boolean not null default false;

create table if not exists public.digital_menus (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un menú puede quedar sin empresa y volver a asignarse sin perder contenido.
create unique index if not exists digital_menus_one_assigned_menu_per_company
  on public.digital_menus(company_id) where company_id is not null;

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.digital_menus(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists menu_categories_menu_sort_idx
  on public.menu_categories(menu_id, sort_order, created_at);

create table if not exists public.menu_products (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.digital_menus(id) on delete cascade,
  category_id uuid references public.menu_categories(id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 140),
  description text,
  price numeric(12,2) not null default 0 check (price >= 0),
  currency_code text not null default 'COP' check (currency_code ~ '^[A-Z]{3}$'),
  image_url text,
  available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists menu_products_menu_category_sort_idx
  on public.menu_products(menu_id, category_id, sort_order, created_at);

create table if not exists public.digital_menu_audit_log (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid references public.digital_menus(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('created', 'assigned', 'unassigned', 'feature_enabled', 'feature_disabled')),
  from_company_id uuid references public.companies(id) on delete set null,
  to_company_id uuid references public.companies(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.digital_menu_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists digital_menus_touch_updated_at on public.digital_menus;
create trigger digital_menus_touch_updated_at before update on public.digital_menus
for each row execute function public.digital_menu_touch_updated_at();
drop trigger if exists menu_categories_touch_updated_at on public.menu_categories;
create trigger menu_categories_touch_updated_at before update on public.menu_categories
for each row execute function public.digital_menu_touch_updated_at();
drop trigger if exists menu_products_touch_updated_at on public.menu_products;
create trigger menu_products_touch_updated_at before update on public.menu_products
for each row execute function public.digital_menu_touch_updated_at();

create or replace function public.digital_menu_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.digital_menu_company_can_read(p_menu_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.companies c on c.id = p.company_id
    join public.digital_menus m on m.company_id = c.id
    where p.id = auth.uid()
      and p.role = 'company'
      and c.menu_digital_enabled = true
      and m.id = p_menu_id
  );
$$;

-- La reasignación se hace de forma atómica: primero se libera el menú actual
-- de la empresa destino y luego se conserva el contenido del menú elegido.
create or replace function public.assign_digital_menu(
  p_menu_id uuid,
  p_company_id uuid,
  p_actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous_company_id uuid;
  v_displaced_menu_id uuid;
begin
  select company_id into v_previous_company_id
  from public.digital_menus where id = p_menu_id for update;
  if not found then
    raise exception 'digital menu not found' using errcode = 'P0002';
  end if;

  select id into v_displaced_menu_id
  from public.digital_menus
  where company_id = p_company_id and id <> p_menu_id
  for update;

  if v_displaced_menu_id is not null then
    update public.digital_menus set company_id = null where id = v_displaced_menu_id;
    insert into public.digital_menu_audit_log(menu_id, actor_id, action, from_company_id, to_company_id)
    values (v_displaced_menu_id, p_actor_id, 'unassigned', p_company_id, null);
  end if;

  update public.digital_menus set company_id = p_company_id where id = p_menu_id;
  insert into public.digital_menu_audit_log(menu_id, actor_id, action, from_company_id, to_company_id)
  values (p_menu_id, p_actor_id, 'assigned', v_previous_company_id, p_company_id);
end;
$$;

create or replace function public.unassign_digital_menu(p_menu_id uuid, p_actor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_previous_company_id uuid;
begin
  select company_id into v_previous_company_id from public.digital_menus where id = p_menu_id for update;
  if not found then raise exception 'digital menu not found' using errcode = 'P0002'; end if;
  update public.digital_menus set company_id = null where id = p_menu_id;
  insert into public.digital_menu_audit_log(menu_id, actor_id, action, from_company_id, to_company_id)
  values (p_menu_id, p_actor_id, 'unassigned', v_previous_company_id, null);
end;
$$;

alter table public.digital_menus enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_products enable row level security;
alter table public.digital_menu_audit_log enable row level security;

drop policy if exists "Digital menus: admin all" on public.digital_menus;
drop policy if exists "Digital menus: assigned company read" on public.digital_menus;
drop policy if exists "Menu categories: admin all" on public.menu_categories;
drop policy if exists "Menu categories: assigned company read" on public.menu_categories;
drop policy if exists "Menu products: admin all" on public.menu_products;
drop policy if exists "Menu products: assigned company read" on public.menu_products;
drop policy if exists "Digital menu audit: admin read" on public.digital_menu_audit_log;

create policy "Digital menus: admin all" on public.digital_menus for all to authenticated
using (public.digital_menu_is_admin()) with check (public.digital_menu_is_admin());
create policy "Digital menus: assigned company read" on public.digital_menus for select to authenticated
using (public.digital_menu_company_can_read(id));
create policy "Menu categories: admin all" on public.menu_categories for all to authenticated
using (public.digital_menu_is_admin()) with check (public.digital_menu_is_admin());
create policy "Menu categories: assigned company read" on public.menu_categories for select to authenticated
using (public.digital_menu_company_can_read(menu_id));
create policy "Menu products: admin all" on public.menu_products for all to authenticated
using (public.digital_menu_is_admin()) with check (public.digital_menu_is_admin());
create policy "Menu products: assigned company read" on public.menu_products for select to authenticated
using (public.digital_menu_company_can_read(menu_id));
create policy "Digital menu audit: admin read" on public.digital_menu_audit_log for select to authenticated
using (public.digital_menu_is_admin());

-- Las políticas RLS deciden qué filas puede ver cada usuario; estos GRANT
-- habilitan el acceso de tabla para los roles que las políticas evalúan.
grant select on public.digital_menus, public.menu_categories, public.menu_products, public.digital_menu_audit_log to authenticated;
grant all privileges on public.digital_menus, public.menu_categories, public.menu_products, public.digital_menu_audit_log to service_role;

revoke all on function public.assign_digital_menu(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.unassign_digital_menu(uuid, uuid) from public, anon, authenticated;
grant execute on function public.assign_digital_menu(uuid, uuid, uuid) to service_role;
grant execute on function public.unassign_digital_menu(uuid, uuid) to service_role;

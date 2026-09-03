begin;

create table public.inventory_units (
  id uuid primary key default gen_random_uuid(),

  -- Regla estricta: una placa física por código.
  code_id uuid not null,

  status text not null default 'available',

  reservation_token uuid,
  reserved_at timestamptz,
  reservation_expires_at timestamptz,

  assigned_at timestamptz,
  retired_at timestamptz,

  -- Preparado para reemplazos futuros, sin funcionalidad en esta fase.
  replacement_for_inventory_unit_id uuid,

  created_at timestamptz not null default now(),

  constraint inventory_units_code_id_key
    unique (code_id),

  constraint inventory_units_code_id_fkey
    foreign key (code_id)
    references public.codes(id)
    on delete restrict,

  constraint inventory_units_replacement_for_fkey
    foreign key (replacement_for_inventory_unit_id)
    references public.inventory_units(id)
    on delete restrict,

  constraint inventory_units_status_check
    check (status in ('available', 'reserved', 'assigned', 'retired')),

  constraint inventory_units_lifecycle_check
    check (
      (
        status = 'available'
        and reservation_token is null
        and reserved_at is null
        and reservation_expires_at is null
        and assigned_at is null
        and retired_at is null
      )
      or
      (
        status = 'reserved'
        and reservation_token is not null
        and reserved_at is not null
        and reservation_expires_at is not null
        and assigned_at is null
        and retired_at is null
      )
      or
      (
        status = 'assigned'
        and reservation_token is null
        and reserved_at is null
        and reservation_expires_at is null
        and assigned_at is not null
        and retired_at is null
      )
      or
      (
        status = 'retired'
        and reservation_token is null
        and reserved_at is null
        and reservation_expires_at is null
        and retired_at is not null
      )
    )
);

create unique index inventory_units_reservation_token_key
  on public.inventory_units (reservation_token)
  where reservation_token is not null;

create unique index inventory_units_replacement_for_key
  on public.inventory_units (replacement_for_inventory_unit_id)
  where replacement_for_inventory_unit_id is not null;

create index inventory_units_available_idx
  on public.inventory_units (created_at)
  where status = 'available';

create index inventory_units_reservation_expiry_idx
  on public.inventory_units (reservation_expires_at)
  where status = 'reserved';

alter table public.inventory_units enable row level security;

revoke all on table public.inventory_units from anon, authenticated;

grant usage on schema public to service_role;

grant select, insert, update, delete
  on table public.inventory_units
  to service_role;

commit;

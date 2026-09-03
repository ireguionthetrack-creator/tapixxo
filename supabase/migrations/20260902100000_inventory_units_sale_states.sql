begin;

alter table public.inventory_units
  add column processing_at timestamptz;

alter table public.inventory_units
  drop constraint inventory_units_status_check,
  drop constraint inventory_units_lifecycle_check;

alter table public.inventory_units
  add constraint inventory_units_status_check
    check (
      status in (
        'not_for_sale',
        'available',
        'reserved',
        'processing',
        'assigned',
        'retired'
      )
    ),
  add constraint inventory_units_lifecycle_check
    check (
      (
        status in ('not_for_sale', 'available')
        and reservation_token is null
        and reserved_at is null
        and reservation_expires_at is null
        and processing_at is null
        and assigned_at is null
        and retired_at is null
      )
      or
      (
        status = 'reserved'
        and reservation_token is not null
        and reserved_at is not null
        and reservation_expires_at is not null
        and processing_at is null
        and assigned_at is null
        and retired_at is null
      )
      or
      (
        status = 'processing'
        and reservation_token is null
        and reserved_at is null
        and reservation_expires_at is null
        and processing_at is not null
        and assigned_at is null
        and retired_at is null
      )
      or
      (
        status = 'assigned'
        and reservation_token is null
        and reserved_at is null
        and reservation_expires_at is null
        and processing_at is null
        and assigned_at is not null
        and retired_at is null
      )
      or
      (
        status = 'retired'
        and reservation_token is null
        and reserved_at is null
        and reservation_expires_at is null
        and processing_at is null
        and assigned_at is null
        and retired_at is not null
      )
    );

create index inventory_units_processing_idx
  on public.inventory_units (processing_at)
  where status = 'processing';

commit;

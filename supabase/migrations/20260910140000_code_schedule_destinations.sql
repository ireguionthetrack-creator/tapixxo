begin;

-- La zona horaria pertenece a la empresa, no a cada placa. Es opcional para
-- no alterar el comportamiento de empresas existentes; un horario solo puede
-- activarse cuando la empresa haya elegido una zona IANA válida.
alter table public.companies
  add column if not exists time_zone text;

create or replace function public.is_valid_iana_time_zone(p_time_zone text)
returns boolean
language sql
stable
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from pg_timezone_names
    where name = p_time_zone
  );
$$;

alter table public.companies
  drop constraint if exists companies_time_zone_check;
alter table public.companies
  add constraint companies_time_zone_check
  check (time_zone is null or public.is_valid_iana_time_zone(time_zone));

create table if not exists public.code_schedules (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null unique references public.codes(id) on delete cascade,
  schedule_kind text not null check (schedule_kind in ('daily', 'date')),
  schedule_date date,
  enabled boolean not null default true,
  after_behavior text not null default 'keep_last'
    check (after_behavior in ('keep_last', 'default_destination', 'custom_destination')),
  after_custom_destination_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint code_schedules_date_shape_check check (
    (schedule_kind = 'daily' and schedule_date is null)
    or (schedule_kind = 'date' and schedule_date is not null)
  ),
  constraint code_schedules_after_destination_check check (
    (after_behavior = 'custom_destination'
      and after_custom_destination_url ~* '^https?://[^[:space:]]+$'
      and char_length(after_custom_destination_url) <= 2000)
    or (after_behavior <> 'custom_destination' and after_custom_destination_url is null)
  )
);

create table if not exists public.code_schedule_rules (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.code_schedules(id) on delete cascade,
  start_time time not null,
  end_time time not null,
  destination_type text not null
    check (destination_type in ('primary', 'google_reviews', 'whatsapp', 'custom')),
  destination_url text not null check (
    destination_url ~* '^https?://[^[:space:]]+$'
    and char_length(destination_url) <= 2000
  ),
  sort_order smallint not null default 0 check (sort_order between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint code_schedule_rules_nonzero_duration_check check (start_time <> end_time)
);

create index if not exists code_schedule_rules_schedule_sort_idx
  on public.code_schedule_rules (schedule_id, sort_order, start_time);
create index if not exists code_schedules_enabled_code_idx
  on public.code_schedules (code_id) where enabled;

-- Dos tramos se solapan incluso si uno cruza medianoche. Los bordes pueden
-- tocarse: 08:00–12:00 y 12:00–18:00 son válidos.
create or replace function public.code_schedule_times_overlap(
  p_first_start time,
  p_first_end time,
  p_second_start time,
  p_second_end time
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  with first_intervals(start_minute, end_minute) as (
    select extract(epoch from p_first_start)::integer / 60,
      case when p_first_end > p_first_start
        then extract(epoch from p_first_end)::integer / 60 else 1440 end
    union all
    select 0, extract(epoch from p_first_end)::integer / 60
      where p_first_end < p_first_start
  ), second_intervals(start_minute, end_minute) as (
    select extract(epoch from p_second_start)::integer / 60,
      case when p_second_end > p_second_start
        then extract(epoch from p_second_end)::integer / 60 else 1440 end
    union all
    select 0, extract(epoch from p_second_end)::integer / 60
      where p_second_end < p_second_start
  )
  select exists (
    select 1 from first_intervals first_interval
    cross join second_intervals second_interval
    where first_interval.start_minute < second_interval.end_minute
      and second_interval.start_minute < first_interval.end_minute
  );
$$;

create or replace function public.prevent_overlapping_code_schedule_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.schedule_id::text, 0));

  if exists (
    select 1
    from public.code_schedule_rules as existing_rule
    where existing_rule.schedule_id = new.schedule_id
      and existing_rule.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and public.code_schedule_times_overlap(
        existing_rule.start_time,
        existing_rule.end_time,
        new.start_time,
        new.end_time
      )
  ) then
    raise exception 'schedule rules overlap';
  end if;

  return new;
end;
$$;

drop trigger if exists code_schedule_rules_prevent_overlap on public.code_schedule_rules;
create trigger code_schedule_rules_prevent_overlap
before insert or update of schedule_id, start_time, end_time
on public.code_schedule_rules
for each row execute function public.prevent_overlapping_code_schedule_rules();

alter table public.code_schedules enable row level security;
alter table public.code_schedule_rules enable row level security;
revoke all on table public.code_schedules, public.code_schedule_rules from public, anon, authenticated;
grant select, insert, update, delete on table public.code_schedules, public.code_schedule_rules to service_role;

-- Una sola RPC sustituye la configuración completa, dentro de una transacción,
-- y vuelve a comprobar la propiedad de la placa en la base de datos.
create or replace function public.replace_company_code_schedule(
  p_company_id uuid,
  p_code_id uuid,
  p_enabled boolean,
  p_schedule_kind text,
  p_schedule_date date,
  p_after_behavior text,
  p_after_custom_destination_url text,
  p_time_zone text,
  p_rules jsonb
)
returns table (schedule_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schedule_id uuid;
  v_code_destination text;
  v_rule jsonb;
  v_rule_destination text;
  v_rule_type text;
  v_start time;
  v_end time;
  v_position integer := 0;
begin
  if not public.is_valid_iana_time_zone(p_time_zone) then
    raise exception 'invalid time zone';
  end if;

  if p_schedule_kind not in ('daily', 'date')
    or (p_schedule_kind = 'daily' and p_schedule_date is not null)
    or (p_schedule_kind = 'date' and p_schedule_date is null) then
    raise exception 'invalid schedule kind';
  end if;

  if p_after_behavior not in ('keep_last', 'default_destination', 'custom_destination') then
    raise exception 'invalid after behavior';
  end if;

  if p_after_behavior = 'custom_destination'
    and (p_after_custom_destination_url !~* '^https?://[^[:space:]]+$'
      or char_length(p_after_custom_destination_url) > 2000) then
    raise exception 'invalid custom after destination';
  end if;

  if jsonb_typeof(p_rules) <> 'array' or jsonb_array_length(p_rules) = 0
    or jsonb_array_length(p_rules) > 24 then
    raise exception 'invalid schedule rules';
  end if;

  select code.destination_url into v_code_destination
  from public.codes as code
  left join public.code_groups as code_group on code_group.id = code.group_id
  where code.id = p_code_id
    and coalesce(code.company_id, code_group.company_id) = p_company_id
  for update;

  if not found then
    raise exception 'code does not belong to company';
  end if;

  update public.companies
  set time_zone = p_time_zone
  where id = p_company_id;

  insert into public.code_schedules as schedule (
    code_id, enabled, schedule_kind, schedule_date,
    after_behavior, after_custom_destination_url, updated_at
  ) values (
    p_code_id, p_enabled, p_schedule_kind, p_schedule_date,
    p_after_behavior,
    case when p_after_behavior = 'custom_destination' then p_after_custom_destination_url else null end,
    now()
  )
  on conflict (code_id) do update set
    enabled = excluded.enabled,
    schedule_kind = excluded.schedule_kind,
    schedule_date = excluded.schedule_date,
    after_behavior = excluded.after_behavior,
    after_custom_destination_url = excluded.after_custom_destination_url,
    updated_at = now()
  returning id into v_schedule_id;

  delete from public.code_schedule_rules where schedule_id = v_schedule_id;

  for v_rule in select value from jsonb_array_elements(p_rules) loop
    v_rule_type := v_rule->>'destinationType';
    v_start := (v_rule->>'startTime')::time;
    v_end := (v_rule->>'endTime')::time;
    if v_rule_type not in ('primary', 'google_reviews', 'whatsapp', 'custom')
      or v_start is null or v_end is null or v_start = v_end then
      raise exception 'invalid schedule rule';
    end if;

    if v_rule_type = 'primary' then
      v_rule_destination := v_code_destination;
    elsif v_rule_type = 'google_reviews' then
      select review_url into v_rule_destination
      from public.company_google_review_destinations
      where company_id = p_company_id;
    else
      v_rule_destination := nullif(btrim(v_rule->>'destinationUrl'), '');
    end if;

    if v_rule_destination is null
      or v_rule_destination !~* '^https?://[^[:space:]]+$'
      or char_length(v_rule_destination) > 2000 then
      raise exception 'invalid schedule destination';
    end if;

    insert into public.code_schedule_rules (
      schedule_id, start_time, end_time, destination_type, destination_url, sort_order, updated_at
    ) values (
      v_schedule_id, v_start, v_end, v_rule_type, v_rule_destination, v_position, now()
    );
    v_position := v_position + 1;
  end loop;

  return query select v_schedule_id;
end;
$$;

create or replace function public.delete_company_code_schedule(
  p_company_id uuid,
  p_code_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.codes as code
    left join public.code_groups as code_group on code_group.id = code.group_id
    where code.id = p_code_id
      and coalesce(code.company_id, code_group.company_id) = p_company_id
  ) then
    raise exception 'code does not belong to company';
  end if;

  delete from public.code_schedules where code_id = p_code_id;
  return found;
end;
$$;

-- El lector público sigue consultando una única vez por placa. Esta función
-- determina un destino sin exponer las tablas de horarios al navegador.
create or replace function public.resolve_public_code_destination(
  p_code text,
  p_scanned_at timestamptz default now()
)
returns table (
  code_id uuid,
  code text,
  destination_url text,
  active boolean,
  company_id uuid,
  group_id uuid,
  schedule_id uuid,
  schedule_rule_id uuid,
  destination_source text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code public.codes%rowtype;
  v_company_id uuid;
  v_time_zone text;
  v_schedule public.code_schedules%rowtype;
  v_rule public.code_schedule_rules%rowtype;
  v_last_rule public.code_schedule_rules%rowtype;
  v_local_timestamp timestamp;
  v_local_date date;
  v_local_time time;
  v_date_applies boolean;
begin
  select * into v_code
  from public.codes
  where codes.code = p_code and codes.active = true;
  if not found then return; end if;

  v_company_id := v_code.company_id;
  if v_company_id is null and v_code.group_id is not null then
    select company_id into v_company_id from public.code_groups where id = v_code.group_id;
  end if;

  select time_zone into v_time_zone from public.companies where id = v_company_id;
  select * into v_schedule from public.code_schedules
    where code_schedules.code_id = v_code.id and enabled = true;

  if found and v_time_zone is not null then
    v_local_timestamp := timezone(v_time_zone, p_scanned_at);
    v_local_date := v_local_timestamp::date;
    v_local_time := v_local_timestamp::time;

    select rule.* into v_rule
    from public.code_schedule_rules as rule
    where rule.schedule_id = v_schedule.id
      and (
        v_schedule.schedule_kind = 'daily'
        or (rule.start_time < rule.end_time and v_local_date = v_schedule.schedule_date)
        or (rule.start_time > rule.end_time and (
          (v_local_date = v_schedule.schedule_date and v_local_time >= rule.start_time)
          or (v_local_date = v_schedule.schedule_date + 1 and v_local_time < rule.end_time)
        ))
      )
      and (
        (rule.start_time < rule.end_time and v_local_time >= rule.start_time and v_local_time < rule.end_time)
        or (rule.start_time > rule.end_time and (v_local_time >= rule.start_time or v_local_time < rule.end_time))
      )
    order by rule.sort_order, rule.start_time
    limit 1;

    if found then
      return query select v_code.id, v_code.code, v_rule.destination_url, v_code.active,
        v_company_id, v_code.group_id, v_schedule.id, v_rule.id, 'schedule_rule';
      return;
    end if;

    v_date_applies := v_schedule.schedule_kind = 'daily' or v_local_date = v_schedule.schedule_date;
    if v_date_applies and v_schedule.after_behavior = 'custom_destination' then
      return query select v_code.id, v_code.code, v_schedule.after_custom_destination_url, v_code.active,
        v_company_id, v_code.group_id, v_schedule.id, null::uuid, 'schedule_after_custom';
      return;
    end if;

    if v_date_applies and v_schedule.after_behavior = 'keep_last' then
      select rule.* into v_last_rule
      from public.code_schedule_rules as rule
      where rule.schedule_id = v_schedule.id
        and rule.start_time < rule.end_time
        and rule.start_time <= v_local_time
        and rule.end_time <= v_local_time
      order by rule.end_time desc, rule.sort_order desc
      limit 1;
      if found then
        return query select v_code.id, v_code.code, v_last_rule.destination_url, v_code.active,
          v_company_id, v_code.group_id, v_schedule.id, v_last_rule.id, 'schedule_after_last';
        return;
      end if;
    end if;
  end if;

  return query select v_code.id, v_code.code, v_code.destination_url, v_code.active,
    v_company_id, v_code.group_id, null::uuid, null::uuid, 'primary';
end;
$$;

alter table public.code_scans
  add column if not exists schedule_id uuid references public.code_schedules(id) on delete set null,
  add column if not exists schedule_rule_id uuid references public.code_schedule_rules(id) on delete set null,
  add column if not exists resolved_destination_url text,
  add column if not exists destination_source text;

alter table public.code_scans
  drop constraint if exists code_scans_resolved_destination_url_check;
alter table public.code_scans
  add constraint code_scans_resolved_destination_url_check check (
    resolved_destination_url is null
    or (resolved_destination_url ~* '^https?://[^[:space:]]+$'
      and char_length(resolved_destination_url) <= 2000)
  );

create index if not exists code_scans_schedule_id_idx
  on public.code_scans (schedule_id) where schedule_id is not null;
create index if not exists code_scans_schedule_rule_id_idx
  on public.code_scans (schedule_rule_id) where schedule_rule_id is not null;

revoke all on function public.replace_company_code_schedule(uuid, uuid, boolean, text, date, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_company_code_schedule(uuid, uuid, boolean, text, date, text, text, text, jsonb)
  to service_role;
revoke all on function public.delete_company_code_schedule(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.delete_company_code_schedule(uuid, uuid) to service_role;
revoke all on function public.resolve_public_code_destination(text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.resolve_public_code_destination(text, timestamptz) to service_role;

notify pgrst, 'reload schema';

commit;

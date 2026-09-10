begin;

-- Evoluciona el modelo inicial (un horario por placa) a uno reutilizable.
alter table public.code_schedules add column if not exists company_id uuid;
alter table public.code_schedules add column if not exists name text;
alter table public.code_schedules add column if not exists apply_to_future_plates boolean not null default false;

update public.code_schedules as schedule
set company_id = coalesce(code.company_id, code_group.company_id)
from public.codes as code
left join public.code_groups as code_group on code_group.id = code.group_id
where schedule.code_id = code.id and schedule.company_id is null;

alter table public.code_schedules
  add constraint code_schedules_company_id_fkey
  foreign key (company_id) references public.companies(id) on delete cascade;
create index if not exists code_schedules_company_enabled_idx
  on public.code_schedules (company_id, enabled);
create unique index if not exists code_schedules_one_future_default_idx
  on public.code_schedules (company_id)
  where enabled and apply_to_future_plates;

create table if not exists public.code_schedule_assignments (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.code_schedules(id) on delete cascade,
  code_id uuid not null unique references public.codes(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists code_schedule_assignments_schedule_idx
  on public.code_schedule_assignments (schedule_id);

-- Conserva cualquier configuración creada con el modelo inicial.
insert into public.code_schedule_assignments (schedule_id, code_id)
select id, code_id from public.code_schedules
where code_id is not null
on conflict (code_id) do nothing;

alter table public.code_schedules drop constraint if exists code_schedules_code_id_key;
alter table public.code_schedules alter column code_id drop not null;

-- El tipo "primary" conserva el destino propio de cada placa y por ello no
-- almacena una copia de URL en una regla compartida.
alter table public.code_schedule_rules alter column destination_url drop not null;
alter table public.code_schedule_rules drop constraint if exists code_schedule_rules_destination_url_check;
alter table public.code_schedule_rules add constraint code_schedule_rules_destination_url_check check (
  (destination_type = 'primary' and destination_url is null)
  or (destination_type <> 'primary' and destination_url ~* '^https?://[^[:space:]]+$' and char_length(destination_url) <= 2000)
);

alter table public.code_schedule_assignments enable row level security;
revoke all on table public.code_schedule_assignments from public, anon, authenticated;
grant select, insert, update, delete on table public.code_schedule_assignments to service_role;

create or replace function public.assign_default_schedule_to_new_code()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_company_id uuid; v_schedule_id uuid;
begin
  v_company_id := new.company_id;
  if v_company_id is null and new.group_id is not null then
    select company_id into v_company_id from public.code_groups where id = new.group_id;
  end if;
  select id into v_schedule_id from public.code_schedules
    where company_id = v_company_id and enabled and apply_to_future_plates limit 1;
  if v_schedule_id is not null then
    insert into public.code_schedule_assignments (schedule_id, code_id)
    values (v_schedule_id, new.id) on conflict (code_id) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists codes_assign_default_schedule on public.codes;
create trigger codes_assign_default_schedule after insert on public.codes
for each row execute function public.assign_default_schedule_to_new_code();

create or replace function public.save_company_shared_code_schedule(
  p_company_id uuid, p_schedule_id uuid, p_name text, p_enabled boolean,
  p_schedule_kind text, p_schedule_date date, p_after_behavior text,
  p_after_custom_destination_url text, p_time_zone text, p_apply_to_future_plates boolean,
  p_code_ids uuid[], p_replace_conflicts boolean, p_rules jsonb
) returns table (schedule_id uuid, affected_plates integer)
language plpgsql security definer set search_path = public as $$
declare v_schedule_id uuid; v_owned integer; v_conflicts integer; v_rule jsonb;
  v_destination text; v_type text; v_position integer := 0;
begin
  if not public.is_valid_iana_time_zone(p_time_zone) then raise exception 'invalid time zone'; end if;
  if p_schedule_kind not in ('daily','date') or (p_schedule_kind='date' and p_schedule_date is null) or (p_schedule_kind='daily' and p_schedule_date is not null) then raise exception 'invalid schedule kind'; end if;
  if p_after_behavior not in ('keep_last','default_destination','custom_destination') then raise exception 'invalid after behavior'; end if;
  if p_after_behavior='custom_destination' and (p_after_custom_destination_url !~* '^https?://[^[:space:]]+$') then raise exception 'invalid custom after destination'; end if;
  if jsonb_typeof(p_rules) <> 'array' or jsonb_array_length(p_rules)=0 or jsonb_array_length(p_rules)>24 then raise exception 'invalid schedule rules'; end if;
  select count(*) into v_owned from public.codes c left join public.code_groups g on g.id=c.group_id
   where c.id=any(p_code_ids) and coalesce(c.company_id,g.company_id)=p_company_id;
  if v_owned <> coalesce(cardinality(p_code_ids),0) then raise exception 'codes do not belong to company'; end if;
  if p_schedule_id is not null and not exists(select 1 from public.code_schedules where id=p_schedule_id and company_id=p_company_id) then raise exception 'schedule does not belong to company'; end if;
  if not p_replace_conflicts then
    select count(*) into v_conflicts from public.code_schedule_assignments a
    where a.code_id=any(p_code_ids) and (p_schedule_id is null or a.schedule_id<>p_schedule_id);
    if v_conflicts > 0 then raise exception 'some codes already have an active schedule'; end if;
  end if;
  update public.companies set time_zone=p_time_zone where id=p_company_id;
  if p_schedule_id is null then
    insert into public.code_schedules(company_id,name,enabled,schedule_kind,schedule_date,after_behavior,after_custom_destination_url,apply_to_future_plates,updated_at)
    values(p_company_id,nullif(btrim(p_name),''),p_enabled,p_schedule_kind,p_schedule_date,p_after_behavior,case when p_after_behavior='custom_destination' then p_after_custom_destination_url else null end,p_apply_to_future_plates,now()) returning id into v_schedule_id;
  else
    update public.code_schedules set name=nullif(btrim(p_name),''),enabled=p_enabled,schedule_kind=p_schedule_kind,schedule_date=p_schedule_date,after_behavior=p_after_behavior,after_custom_destination_url=case when p_after_behavior='custom_destination' then p_after_custom_destination_url else null end,apply_to_future_plates=p_apply_to_future_plates,updated_at=now() where id=p_schedule_id returning id into v_schedule_id;
    delete from public.code_schedule_rules where schedule_id=v_schedule_id;
  end if;
  for v_rule in select value from jsonb_array_elements(p_rules) loop
    v_type:=v_rule->>'destinationType';
    if v_type not in ('primary','google_reviews','whatsapp','custom') or (v_rule->>'startTime')::time=(v_rule->>'endTime')::time then raise exception 'invalid schedule rule'; end if;
    if v_type='google_reviews' then select review_url into v_destination from public.company_google_review_destinations where company_id=p_company_id;
    elsif v_type='primary' then v_destination:=null;
    else v_destination:=nullif(btrim(v_rule->>'destinationUrl'),''); end if;
    if (v_type <> 'primary') and (v_destination is null or v_destination !~* '^https?://[^[:space:]]+$') then raise exception 'invalid schedule destination'; end if;
    insert into public.code_schedule_rules(schedule_id,start_time,end_time,destination_type,destination_url,sort_order) values(v_schedule_id,(v_rule->>'startTime')::time,(v_rule->>'endTime')::time,v_type,v_destination,v_position); v_position:=v_position+1;
  end loop;
  insert into public.code_schedule_assignments as a(schedule_id,code_id)
  select v_schedule_id, unnest(p_code_ids)
  on conflict(code_id) do update set schedule_id=excluded.schedule_id,updated_at=now();
  get diagnostics v_owned = row_count;
  return query select v_schedule_id,v_owned;
end;
$$;

-- Reemplaza el resolutor uno-a-uno: una asignación única por placa garantiza
-- que jamás compitan dos schedules activos durante un escaneo.
create or replace function public.resolve_public_code_destination(p_code text,p_scanned_at timestamptz default now())
returns table(code_id uuid,code text,destination_url text,active boolean,company_id uuid,group_id uuid,schedule_id uuid,schedule_rule_id uuid,destination_source text)
language plpgsql security definer set search_path=public as $$
declare c public.codes%rowtype; v_company uuid; tz text; s public.code_schedules%rowtype; r public.code_schedule_rules%rowtype; local_ts timestamp; d date; t time;
begin
 select * into c from public.codes where codes.code=p_code and active; if not found then return; end if;
 v_company:=c.company_id; if v_company is null then select company_id into v_company from public.code_groups where id=c.group_id; end if;
 select cs.* into s from public.code_schedule_assignments a join public.code_schedules cs on cs.id=a.schedule_id where a.code_id=c.id and cs.enabled;
 select time_zone into tz from public.companies where id=v_company;
 if found and tz is not null then
  local_ts:=timezone(tz,p_scanned_at); d:=local_ts::date;t:=local_ts::time;
  select x.* into r from public.code_schedule_rules x where x.schedule_id=s.id and (s.schedule_kind='daily' or (x.start_time<x.end_time and d=s.schedule_date) or (x.start_time>x.end_time and ((d=s.schedule_date and t>=x.start_time) or (d=s.schedule_date+1 and t<x.end_time)))) and ((x.start_time<x.end_time and t>=x.start_time and t<x.end_time) or (x.start_time>x.end_time and (t>=x.start_time or t<x.end_time))) limit 1;
  if found then return query select c.id,c.code,coalesce(r.destination_url,c.destination_url),c.active,v_company,c.group_id,s.id,r.id,'schedule_rule';return;end if;
  if (s.schedule_kind='daily' or d=s.schedule_date) and s.after_behavior='keep_last' then
    select x.* into r from public.code_schedule_rules x where x.schedule_id=s.id and x.start_time<x.end_time and x.end_time<=t order by x.end_time desc limit 1;
    if found then return query select c.id,c.code,coalesce(r.destination_url,c.destination_url),c.active,v_company,c.group_id,s.id,r.id,'schedule_after_last';return;end if;
  end if;
  if (s.schedule_kind='daily' or d=s.schedule_date) and s.after_behavior='custom_destination' then return query select c.id,c.code,s.after_custom_destination_url,c.active,v_company,c.group_id,s.id,null::uuid,'schedule_after_custom';return;end if;
 end if;
 return query select c.id,c.code,c.destination_url,c.active,v_company,c.group_id,null::uuid,null::uuid,'primary';
end;$$;

revoke all on function public.save_company_shared_code_schedule(uuid,uuid,text,boolean,text,date,text,text,text,boolean,uuid[],boolean,jsonb) from public,anon,authenticated;
grant execute on function public.save_company_shared_code_schedule(uuid,uuid,text,boolean,text,date,text,text,text,boolean,uuid[],boolean,jsonb) to service_role;
notify pgrst,'reload schema';
commit;

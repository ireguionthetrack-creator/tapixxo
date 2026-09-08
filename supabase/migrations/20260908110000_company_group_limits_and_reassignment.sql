begin;

create or replace function public.enforce_company_code_group_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.company_id::text, 0));

  select count(*) into v_group_count
  from public.code_groups
  where company_id = new.company_id;

  if v_group_count >= 5 then
    raise exception 'group limit reached';
  end if;

  return new;
end;
$$;

drop trigger if exists code_groups_enforce_company_limit on public.code_groups;
create trigger code_groups_enforce_company_limit
before insert on public.code_groups
for each row
execute function public.enforce_company_code_group_limit();

create or replace function public.protect_company_code_group_deletion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(old.company_id::text, 0));

  select count(*) into v_group_count
  from public.code_groups
  where company_id = old.company_id;

  if v_group_count <= 1 then
    raise exception 'cannot delete the only group';
  end if;

  if exists (select 1 from public.codes where group_id = old.id) then
    raise exception 'group has codes; use controlled reassignment';
  end if;

  return old;
end;
$$;

drop trigger if exists code_groups_protect_deletion on public.code_groups;
create trigger code_groups_protect_deletion
before delete on public.code_groups
for each row
execute function public.protect_company_code_group_deletion();

create or replace function public.create_company_code_group(
  p_company_id uuid,
  p_name text,
  p_description text
)
returns table (
  id uuid,
  name text,
  description text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_count integer;
begin
  if nullif(btrim(p_name), '') is null or length(btrim(p_name)) > 100 then
    raise exception 'invalid group name';
  end if;

  if p_description is not null and length(btrim(p_description)) > 300 then
    raise exception 'invalid group description';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_company_id::text, 0));

  if not exists (select 1 from public.companies where companies.id = p_company_id) then
    raise exception 'company not found';
  end if;

  select count(*) into v_group_count
  from public.code_groups
  where company_id = p_company_id;

  if v_group_count >= 5 then
    raise exception 'group limit reached';
  end if;

  return query
  insert into public.code_groups (company_id, name, description)
  values (p_company_id, btrim(p_name), nullif(btrim(p_description), ''))
  returning code_groups.id, code_groups.name, code_groups.description, code_groups.created_at;
end;
$$;

create or replace function public.delete_company_code_group(
  p_company_id uuid,
  p_group_id uuid,
  p_replacement_group_id uuid
)
returns table (migrated_codes integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_count integer;
  v_migrated_codes integer := 0;
begin
  if p_group_id = p_replacement_group_id then
    raise exception 'replacement group must be different';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_company_id::text, 0));

  select count(*) into v_group_count
  from public.code_groups
  where company_id = p_company_id;

  if v_group_count <= 1 then
    raise exception 'cannot delete the only group';
  end if;

  if not exists (
    select 1 from public.code_groups
    where id = p_group_id and company_id = p_company_id
  ) then
    raise exception 'group does not belong to company';
  end if;

  if not exists (
    select 1 from public.code_groups
    where id = p_replacement_group_id and company_id = p_company_id
  ) then
    raise exception 'replacement group does not belong to company';
  end if;

  update public.codes
  set company_id = p_company_id,
      group_id = p_replacement_group_id
  where group_id = p_group_id;
  get diagnostics v_migrated_codes = row_count;

  delete from public.code_groups
  where id = p_group_id
    and company_id = p_company_id;

  return query select v_migrated_codes;
end;
$$;

revoke all on function public.create_company_code_group(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.create_company_code_group(uuid, text, text)
  to service_role;

revoke all on function public.delete_company_code_group(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.delete_company_code_group(uuid, uuid, uuid)
  to service_role;

notify pgrst, 'reload schema';

commit;

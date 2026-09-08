begin;

create table if not exists public.company_google_review_destinations (
  company_id uuid primary key references public.companies(id) on delete cascade,
  google_place_id text not null check (char_length(google_place_id) between 1 and 255),
  business_name text not null check (char_length(business_name) between 1 and 200),
  formatted_address text check (formatted_address is null or char_length(formatted_address) <= 500),
  write_a_review_uri text not null check (
    write_a_review_uri ~* '^https://([a-z0-9-]+\.)*google\.com/'
    and char_length(write_a_review_uri) <= 2000
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_google_review_destinations_google_place_id_idx
  on public.company_google_review_destinations (google_place_id);

alter table public.company_google_review_destinations enable row level security;

revoke all on table public.company_google_review_destinations
  from public, anon, authenticated;
grant select, insert, update, delete on table public.company_google_review_destinations
  to service_role;

create or replace function public.apply_company_google_review_destination(
  p_company_id uuid,
  p_google_place_id text,
  p_business_name text,
  p_formatted_address text,
  p_write_a_review_uri text,
  p_code_ids uuid[]
)
returns table (updated_codes integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owned_code_count integer;
  v_unique_code_count integer;
  v_updated_codes integer;
begin
  if not exists (select 1 from public.companies where id = p_company_id) then
    raise exception 'company not found';
  end if;

  if nullif(btrim(p_google_place_id), '') is null
    or char_length(btrim(p_google_place_id)) > 255 then
    raise exception 'invalid Google place id';
  end if;

  if nullif(btrim(p_business_name), '') is null
    or char_length(btrim(p_business_name)) > 200 then
    raise exception 'invalid Google business name';
  end if;

  if p_formatted_address is not null and char_length(btrim(p_formatted_address)) > 500 then
    raise exception 'invalid Google address';
  end if;

  if p_write_a_review_uri !~* '^https://([a-z0-9-]+\.)*google\.com/'
    or char_length(p_write_a_review_uri) > 2000 then
    raise exception 'invalid Google review URL';
  end if;

  if coalesce(cardinality(p_code_ids), 0) > 0 then
    select count(*) into v_unique_code_count
    from (select distinct unnest(p_code_ids) as id) as unique_codes;

    if v_unique_code_count <> cardinality(p_code_ids) then
      raise exception 'duplicate code ids';
    end if;

    select count(*) into v_owned_code_count
    from public.codes as code
    inner join public.code_groups as code_group on code_group.id = code.group_id
    where code_group.company_id = p_company_id
      and code.id = any(p_code_ids);

    if v_owned_code_count <> cardinality(p_code_ids) then
      raise exception 'codes do not belong to company';
    end if;
  end if;

  insert into public.company_google_review_destinations (
    company_id,
    google_place_id,
    business_name,
    formatted_address,
    write_a_review_uri,
    updated_at
  ) values (
    p_company_id,
    btrim(p_google_place_id),
    btrim(p_business_name),
    nullif(btrim(p_formatted_address), ''),
    p_write_a_review_uri,
    now()
  )
  on conflict (company_id) do update set
    google_place_id = excluded.google_place_id,
    business_name = excluded.business_name,
    formatted_address = excluded.formatted_address,
    write_a_review_uri = excluded.write_a_review_uri,
    updated_at = now();

  if coalesce(cardinality(p_code_ids), 0) > 0 then
    update public.codes
    set destination_url = p_write_a_review_uri
    where id = any(p_code_ids);
    get diagnostics v_updated_codes = row_count;
  else
    v_updated_codes := 0;
  end if;

  return query select v_updated_codes;
end;
$$;

revoke all on function public.apply_company_google_review_destination(uuid, text, text, text, text, uuid[])
  from public, anon, authenticated;
grant execute on function public.apply_company_google_review_destination(uuid, text, text, text, text, uuid[])
  to service_role;

notify pgrst, 'reload schema';

commit;

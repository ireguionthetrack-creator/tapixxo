begin;

-- The primary destination is the exact official URL returned by Places API
-- (New). These two optional links are retained only as Google-provided
-- fallbacks; no URL is constructed from a Place ID in this schema.
alter table public.company_google_review_destinations
  add column if not exists google_maps_place_uri text,
  add column if not exists google_maps_reviews_uri text,
  add column if not exists review_url_refreshed_at timestamptz;

alter table public.company_google_review_destinations
  drop constraint if exists company_google_review_destinations_google_maps_place_uri_check,
  drop constraint if exists company_google_review_destinations_google_maps_reviews_uri_check;

alter table public.company_google_review_destinations
  add constraint company_google_review_destinations_google_maps_place_uri_check
  check (
    google_maps_place_uri is null
    or (
      google_maps_place_uri ~* '^https://([a-z0-9-]+\.)*google\.com/'
      and char_length(google_maps_place_uri) <= 2000
    )
  ),
  add constraint company_google_review_destinations_google_maps_reviews_uri_check
  check (
    google_maps_reviews_uri is null
    or (
      google_maps_reviews_uri ~* '^https://([a-z0-9-]+\.)*google\.com/'
      and char_length(google_maps_reviews_uri) <= 2000
    )
  );

-- The preceding browser-first migration preserved Google's former official
-- link in google_maps_write_a_review_uri. Restore that exact value wherever
-- available while the application refreshes all destinations from Place
-- Details (New). This migration does not manufacture an alternative URL.
update public.codes as code
set destination_url = destination.google_maps_write_a_review_uri
from public.company_google_review_destinations as destination
where code.destination_url = destination.write_a_review_uri
  and destination.google_maps_write_a_review_uri is not null;

update public.company_google_review_destinations as destination
set
  write_a_review_uri = coalesce(
    destination.google_maps_write_a_review_uri,
    destination.write_a_review_uri
  ),
  review_url_refreshed_at = null,
  updated_at = now();

create or replace function public.apply_company_google_review_destination(
  p_company_id uuid,
  p_google_place_id text,
  p_business_name text,
  p_formatted_address text,
  p_write_a_review_uri text,
  p_google_maps_place_uri text,
  p_google_maps_reviews_uri text,
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
  v_place_id text;
  v_write_a_review_uri text;
  v_place_uri text;
  v_reviews_uri text;
begin
  if not exists (select 1 from public.companies where id = p_company_id) then
    raise exception 'company not found';
  end if;

  v_place_id := btrim(p_google_place_id);
  if v_place_id !~ '^[A-Za-z0-9_-]{10,255}$' then
    raise exception 'invalid Google place id';
  end if;

  if nullif(btrim(p_business_name), '') is null
    or char_length(btrim(p_business_name)) > 200 then
    raise exception 'invalid Google business name';
  end if;

  if p_formatted_address is not null and char_length(btrim(p_formatted_address)) > 500 then
    raise exception 'invalid Google address';
  end if;

  v_write_a_review_uri := nullif(btrim(p_write_a_review_uri), '');
  if v_write_a_review_uri is null
    or v_write_a_review_uri !~* '^https://([a-z0-9-]+\.)*google\.com/'
    or char_length(v_write_a_review_uri) > 2000 then
    raise exception 'invalid Google write a review URL';
  end if;

  v_place_uri := nullif(btrim(p_google_maps_place_uri), '');
  if v_place_uri is not null and (
    v_place_uri !~* '^https://([a-z0-9-]+\.)*google\.com/'
    or char_length(v_place_uri) > 2000
  ) then
    raise exception 'invalid Google place URL';
  end if;

  v_reviews_uri := nullif(btrim(p_google_maps_reviews_uri), '');
  if v_reviews_uri is not null and (
    v_reviews_uri !~* '^https://([a-z0-9-]+\.)*google\.com/'
    or char_length(v_reviews_uri) > 2000
  ) then
    raise exception 'invalid Google reviews URL';
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

  insert into public.company_google_review_destinations as current_destination (
    company_id,
    google_place_id,
    business_name,
    formatted_address,
    write_a_review_uri,
    google_maps_write_a_review_uri,
    google_maps_place_uri,
    google_maps_reviews_uri,
    review_url_refreshed_at,
    updated_at
  ) values (
    p_company_id,
    v_place_id,
    btrim(p_business_name),
    nullif(btrim(p_formatted_address), ''),
    v_write_a_review_uri,
    v_write_a_review_uri,
    v_place_uri,
    v_reviews_uri,
    now(),
    now()
  )
  on conflict (company_id) do update set
    google_place_id = excluded.google_place_id,
    business_name = excluded.business_name,
    formatted_address = excluded.formatted_address,
    write_a_review_uri = excluded.write_a_review_uri,
    google_maps_write_a_review_uri = excluded.google_maps_write_a_review_uri,
    google_maps_place_uri = excluded.google_maps_place_uri,
    google_maps_reviews_uri = excluded.google_maps_reviews_uri,
    review_url_refreshed_at = excluded.review_url_refreshed_at,
    updated_at = excluded.updated_at;

  if coalesce(cardinality(p_code_ids), 0) > 0 then
    update public.codes
    set destination_url = v_write_a_review_uri
    where id = any(p_code_ids);
    get diagnostics v_updated_codes = row_count;
  else
    v_updated_codes := 0;
  end if;

  return query select v_updated_codes;
end;
$$;

-- Keep the existing function signature available during a rolling deployment.
-- New application code calls the eight-argument function above.
create or replace function public.apply_company_google_review_destination(
  p_company_id uuid,
  p_google_place_id text,
  p_business_name text,
  p_formatted_address text,
  p_write_a_review_uri text,
  p_code_ids uuid[]
)
returns table (updated_codes integer)
language sql
security definer
set search_path = public
as $$
  select * from public.apply_company_google_review_destination(
    p_company_id,
    p_google_place_id,
    p_business_name,
    p_formatted_address,
    p_write_a_review_uri,
    null,
    null,
    p_code_ids
  );
$$;

create or replace function public.refresh_company_google_review_destination(
  p_company_id uuid,
  p_write_a_review_uri text,
  p_google_maps_place_uri text,
  p_google_maps_reviews_uri text
)
returns table (updated_codes integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous_write_a_review_uri text;
  v_write_a_review_uri text;
  v_place_uri text;
  v_reviews_uri text;
  v_updated_codes integer;
begin
  v_write_a_review_uri := nullif(btrim(p_write_a_review_uri), '');
  if v_write_a_review_uri is null
    or v_write_a_review_uri !~* '^https://([a-z0-9-]+\.)*google\.com/'
    or char_length(v_write_a_review_uri) > 2000 then
    raise exception 'invalid Google write a review URL';
  end if;

  v_place_uri := nullif(btrim(p_google_maps_place_uri), '');
  if v_place_uri is not null and (
    v_place_uri !~* '^https://([a-z0-9-]+\.)*google\.com/'
    or char_length(v_place_uri) > 2000
  ) then
    raise exception 'invalid Google place URL';
  end if;

  v_reviews_uri := nullif(btrim(p_google_maps_reviews_uri), '');
  if v_reviews_uri is not null and (
    v_reviews_uri !~* '^https://([a-z0-9-]+\.)*google\.com/'
    or char_length(v_reviews_uri) > 2000
  ) then
    raise exception 'invalid Google reviews URL';
  end if;

  select write_a_review_uri into v_previous_write_a_review_uri
  from public.company_google_review_destinations
  where company_id = p_company_id
  for update;

  if not found then
    raise exception 'Google review destination not found';
  end if;

  update public.company_google_review_destinations
  set
    write_a_review_uri = v_write_a_review_uri,
    google_maps_write_a_review_uri = v_write_a_review_uri,
    google_maps_place_uri = v_place_uri,
    google_maps_reviews_uri = v_reviews_uri,
    review_url_refreshed_at = now(),
    updated_at = now()
  where company_id = p_company_id;

  update public.codes
  set destination_url = v_write_a_review_uri
  where destination_url = v_previous_write_a_review_uri;
  get diagnostics v_updated_codes = row_count;

  return query select v_updated_codes;
end;
$$;

revoke all on function public.apply_company_google_review_destination(uuid, text, text, text, text, uuid[])
  from public, anon, authenticated;
revoke all on function public.apply_company_google_review_destination(uuid, text, text, text, text, text, text, uuid[])
  from public, anon, authenticated;
revoke all on function public.refresh_company_google_review_destination(uuid, text, text, text)
  from public, anon, authenticated;

grant execute on function public.apply_company_google_review_destination(uuid, text, text, text, text, uuid[])
  to service_role;
grant execute on function public.apply_company_google_review_destination(uuid, text, text, text, text, text, text, uuid[])
  to service_role;
grant execute on function public.refresh_company_google_review_destination(uuid, text, text, text)
  to service_role;

notify pgrst, 'reload schema';

commit;

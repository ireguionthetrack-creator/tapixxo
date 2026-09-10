begin;

-- review_url is the canonical destination generated from the saved Place ID.
-- Existing writeAReviewUri data remains secondary compatibility data.
alter table public.company_google_review_destinations
  add column if not exists review_url text;

alter table public.company_google_review_destinations
  drop constraint if exists company_google_review_destinations_review_url_check;

alter table public.company_google_review_destinations
  add constraint company_google_review_destinations_review_url_check
  check (
    review_url is null
    or (
      review_url ~* '^https://search\.google\.com/local/writereview\?placeid=[A-Za-z0-9_-]{10,255}$'
      and char_length(review_url) <= 2000
    )
  );

update public.codes as code
set destination_url =
  'https://search.google.com/local/writereview?placeid=' || destination.google_place_id
from public.company_google_review_destinations as destination
where code.destination_url = coalesce(destination.review_url, destination.write_a_review_uri)
  and destination.google_place_id ~ '^[A-Za-z0-9_-]{10,255}$';

update public.company_google_review_destinations as destination
set
  review_url =
    'https://search.google.com/local/writereview?placeid=' || destination.google_place_id,
  updated_at = now()
where destination.google_place_id ~ '^[A-Za-z0-9_-]{10,255}$';

-- The earlier controlled Google Search experiment used T1000. Once its
-- company has a configured Place ID, return that one plate to the approved
-- canonical review_url as well.
update public.codes as code
set destination_url = destination.review_url
from public.code_groups as code_group
inner join public.company_google_review_destinations as destination
  on destination.company_id = code_group.company_id
where code.group_id = code_group.id
  and code.code = 'T1000'
  and destination.review_url is not null;

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
  v_place_id text;
  v_review_url text;
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

  -- p_write_a_review_uri remains in the signature for backwards compatibility,
  -- but is deliberately ignored. The destination is always derived server-side.
  v_review_url :=
    'https://search.google.com/local/writereview?placeid=' || v_place_id;

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
    review_url,
    write_a_review_uri,
    updated_at
  ) values (
    p_company_id,
    v_place_id,
    btrim(p_business_name),
    nullif(btrim(p_formatted_address), ''),
    v_review_url,
    v_review_url,
    now()
  )
  on conflict (company_id) do update set
    google_place_id = excluded.google_place_id,
    business_name = excluded.business_name,
    formatted_address = excluded.formatted_address,
    review_url = excluded.review_url,
    write_a_review_uri = case
      when current_destination.google_place_id = excluded.google_place_id
        then current_destination.write_a_review_uri
      else excluded.write_a_review_uri
    end,
    google_maps_write_a_review_uri = case
      when current_destination.google_place_id = excluded.google_place_id
        then current_destination.google_maps_write_a_review_uri
      else null
    end,
    google_maps_place_uri = case
      when current_destination.google_place_id = excluded.google_place_id
        then current_destination.google_maps_place_uri
      else null
    end,
    google_maps_reviews_uri = case
      when current_destination.google_place_id = excluded.google_place_id
        then current_destination.google_maps_reviews_uri
      else null
    end,
    updated_at = excluded.updated_at;

  if coalesce(cardinality(p_code_ids), 0) > 0 then
    update public.codes
    set destination_url = v_review_url
    where id = any(p_code_ids);
    get diagnostics v_updated_codes = row_count;
  else
    v_updated_codes := 0;
  end if;

  return query select v_updated_codes;
end;
$$;

-- Keep the newer overload compatible with a rolling deployment while enforcing
-- the same Place-ID-derived primary URL.
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
    p_code_ids
  );
$$;

revoke all on function public.apply_company_google_review_destination(uuid, text, text, text, text, uuid[])
  from public, anon, authenticated;
revoke all on function public.apply_company_google_review_destination(uuid, text, text, text, text, text, text, uuid[])
  from public, anon, authenticated;
grant execute on function public.apply_company_google_review_destination(uuid, text, text, text, text, uuid[])
  to service_role;
grant execute on function public.apply_company_google_review_destination(uuid, text, text, text, text, text, text, uuid[])
  to service_role;

notify pgrst, 'reload schema';

commit;

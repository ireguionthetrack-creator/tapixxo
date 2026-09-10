begin;

-- Optional metadata for a controlled Google Search review-link experiment.
-- The existing Place ID and writeAReviewUri integration remains unchanged.
alter table public.company_google_review_destinations
  add column if not exists google_lrd_id text,
  add column if not exists google_search_review_url text;

alter table public.company_google_review_destinations
  drop constraint if exists company_google_review_destinations_google_lrd_id_check,
  drop constraint if exists company_google_review_destinations_google_search_review_url_check;

alter table public.company_google_review_destinations
  add constraint company_google_review_destinations_google_lrd_id_check
  check (
    google_lrd_id is null
    or google_lrd_id ~* '^0x[0-9a-f]+:0x[0-9a-f]+$'
  ),
  add constraint company_google_review_destinations_google_search_review_url_check
  check (
    google_search_review_url is null
    or (
      google_search_review_url ~* '^https://www\.google\.com/search\?'
      and char_length(google_search_review_url) <= 2000
    )
  );

-- Deliberately scoped to one physical plate for cross-device testing. The
-- Tapixxo public route still records the scan before redirecting this URL.
do $$
begin
  if (select count(*) from public.codes where code = 'T1000') <> 1 then
    raise exception 'Expected exactly one code T1000';
  end if;
end;
$$;

update public.codes
set destination_url =
  'https://www.google.com/search?q=PUNTO+FRIO+RV&ie=UTF-8#lrd=0x8ef62550be3ebe55:0xb79fc1e0ed47c905,3'
where code = 'T1000';

notify pgrst, 'reload schema';

commit;

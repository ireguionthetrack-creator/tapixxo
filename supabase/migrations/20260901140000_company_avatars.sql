alter table public.companies
  add column if not exists profile_image_path text;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'company-avatars',
  'company-avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Company avatars: authenticated write" on storage.objects;

create policy "Company avatars: authenticated write"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'company-avatars'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and (
        profiles.role = 'admin'
        or (
          profiles.role = 'company'
          and profiles.company_id::text = (storage.foldername(name))[1]
        )
      )
  )
)
with check (
  bucket_id = 'company-avatars'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and (
        profiles.role = 'admin'
        or (
          profiles.role = 'company'
          and profiles.company_id::text = (storage.foldername(name))[1]
        )
      )
  )
);

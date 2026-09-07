begin;

alter table public.codes
  add column if not exists qr_png_path text;

create unique index if not exists codes_qr_png_path_key
  on public.codes (qr_png_path)
  where qr_png_path is not null;

alter table public.codes
  drop constraint if exists codes_qr_png_path_format_check;

alter table public.codes
  add constraint codes_qr_png_path_format_check
  check (
    qr_png_path is null
    or qr_png_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$'
  );

create or replace function public.prevent_code_qr_png_replacement()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.qr_png_path is not null
    and new.qr_png_path is distinct from old.qr_png_path then
    raise exception 'El PNG QR permanente de un código no se puede reemplazar.';
  end if;

  return new;
end;
$$;

drop trigger if exists codes_prevent_qr_png_replacement on public.codes;

create trigger codes_prevent_qr_png_replacement
before update of qr_png_path on public.codes
for each row
execute function public.prevent_code_qr_png_replacement();

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'code-qr-png',
  'code-qr-png',
  true,
  1048576,
  array['image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Code QR PNG: public read" on storage.objects;

create policy "Code QR PNG: public read"
on storage.objects
for select
to public
using (bucket_id = 'code-qr-png');

-- No se crean políticas INSERT, UPDATE o DELETE para anon/authenticated.
-- La generación ocurre exclusivamente con service_role en la API administrativa.

notify pgrst, 'reload schema';

commit;

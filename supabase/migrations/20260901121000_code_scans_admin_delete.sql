-- Permite que las rutas administrativas del servidor gestionen códigos.
-- El rol service_role sigue sin exponerse al navegador.
grant usage on schema public to service_role;

grant select, insert, update, delete
  on table public.companies,
  public.code_groups,
  public.codes,
  public.code_scans
  to service_role;

-- Al eliminar un código, sus escaneos se eliminan automáticamente.
do $$
declare
  constraint_name text;
begin
  select conname
    into constraint_name
  from pg_constraint
  where conrelid = 'public.code_scans'::regclass
    and confrelid = 'public.codes'::regclass
    and contype = 'f'
  limit 1;

  if constraint_name is not null then
    execute format(
      'alter table public.code_scans drop constraint %I',
      constraint_name
    );
  end if;

  alter table public.code_scans
    add constraint code_scans_code_id_fkey
    foreign key (code_id)
    references public.codes(id)
    on delete cascade;
end $$;

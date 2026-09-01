-- La eliminación administrativa necesita identificar y borrar los perfiles
-- de las cuentas vinculadas a la empresa.
grant usage on schema public to service_role;

grant select, delete
  on table public.profiles
  to service_role;

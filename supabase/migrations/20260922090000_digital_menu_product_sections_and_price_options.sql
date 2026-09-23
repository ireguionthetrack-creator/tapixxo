-- Los productos existentes conservan sus valores por defecto. Los nuevos
-- campos permiten subtítulos de carta y precios por presentación sin cambiar
-- la estructura ni permisos del menú digital.

alter table public.menu_products
  add column if not exists section_name text,
  add column if not exists price_options jsonb not null default '[]'::jsonb;

alter table public.menu_products
  drop constraint if exists menu_products_section_name_length_check,
  add constraint menu_products_section_name_length_check
    check (section_name is null or char_length(trim(section_name)) between 1 and 100),
  drop constraint if exists menu_products_price_options_array_check,
  add constraint menu_products_price_options_array_check
    check (jsonb_typeof(price_options) = 'array');

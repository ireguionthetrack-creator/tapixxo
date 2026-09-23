begin;

alter table public.digital_menus
  add column if not exists enabled_languages text[] not null default array['es', 'en', 'pt', 'fr']::text[],
  add column if not exists currency_selector_enabled boolean not null default false,
  add column if not exists banner_autoplay_seconds integer not null default 8;

alter table public.digital_menus
  drop constraint if exists digital_menus_enabled_languages_check,
  add constraint digital_menus_enabled_languages_check
    check (
      enabled_languages <@ array['es', 'en', 'pt', 'fr']::text[]
      and enabled_languages @> array['es']::text[]
    ),
  drop constraint if exists digital_menus_banner_autoplay_seconds_check,
  add constraint digital_menus_banner_autoplay_seconds_check
    check (banner_autoplay_seconds between 5 and 45);

alter table public.menu_categories
  add column if not exists bubble_image_url text,
  add column if not exists card_image_url text,
  add column if not exists translations jsonb not null default '{}'::jsonb;

alter table public.menu_products
  add column if not exists translations jsonb not null default '{}'::jsonb,
  add column if not exists section_translations jsonb not null default '{}'::jsonb;

alter table public.menu_categories
  drop constraint if exists menu_categories_translations_object_check,
  add constraint menu_categories_translations_object_check check (jsonb_typeof(translations) = 'object');

alter table public.menu_products
  drop constraint if exists menu_products_translations_object_check,
  add constraint menu_products_translations_object_check check (jsonb_typeof(translations) = 'object'),
  drop constraint if exists menu_products_section_translations_object_check,
  add constraint menu_products_section_translations_object_check check (jsonb_typeof(section_translations) = 'object');

create table if not exists public.menu_banners (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.digital_menus(id) on delete cascade,
  image_url text not null check (char_length(trim(image_url)) between 1 and 2048),
  eyebrow text,
  title text,
  description text,
  translations jsonb not null default '{}'::jsonb check (jsonb_typeof(translations) = 'object'),
  show_overlay boolean not null default true,
  sort_order integer not null default 0 check (sort_order between 0 and 100000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists menu_banners_menu_sort_idx on public.menu_banners(menu_id, sort_order, created_at);

-- Conserva los flyers que Texas ya muestra y los deja disponibles para editar
-- desde la primera apertura del panel, sin cambiar su apariencia pública.
insert into public.menu_banners (menu_id, image_url, eyebrow, title, description, show_overlay, sort_order)
select menu.id, flyer.image_url, flyer.eyebrow, flyer.title, flyer.description, flyer.show_overlay, flyer.sort_order
from public.digital_menus menu
cross join (values
  ('/menu-assets/texas-promo-food.png', 'Sabor de la casa', 'La mesa texana te espera', 'Parrilla, costillas y mariscos hechos para compartir.', true, 0),
  ('/menu-assets/texas-promo-margaritas-sept-22.png', '', '', '', false, 1)
) as flyer(image_url, eyebrow, title, description, show_overlay, sort_order)
where menu.slug = 'texasrestobar'
  and not exists (select 1 from public.menu_banners banner where banner.menu_id = menu.id);

drop trigger if exists menu_banners_touch_updated_at on public.menu_banners;
create trigger menu_banners_touch_updated_at before update on public.menu_banners
for each row execute function public.digital_menu_touch_updated_at();

alter table public.menu_banners enable row level security;
revoke all on table public.menu_banners from public, anon, authenticated;
grant all privileges on public.menu_banners to service_role;

commit;

import { NextResponse } from "next/server";
import { getCompanyDigitalMenuAccess } from "@/lib/digital-menu/access";

export async function GET(_request: Request, { params }: RouteContext<"/api/companies/[id]/digital-menu">) {
  const { id } = await params;
  const access = await getCompanyDigitalMenuAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const [{ data: categoriesWithEditorFields, error: categoriesError }, { data: productsWithEditorFields, error: productsError }] = await Promise.all([
    access.admin.from("menu_categories").select("id, name, description, bubble_image_url, card_image_url, translations, sort_order, is_active, created_at, updated_at").eq("menu_id", access.menu.id).order("sort_order").order("created_at"),
    access.admin.from("menu_products").select("id, category_id, name, description, section_name, translations, section_translations, price, currency_code, image_url, available, sort_order, created_at, updated_at").eq("menu_id", access.menu.id).order("sort_order").order("created_at"),
  ]);
  // Las columnas de edición se agregaron en una migración posterior. Mientras
  // esta se aplica, mantener disponible el acceso al editor con el contenido
  // existente, en vez de ocultar el módulo asignado a la empresa.
  const [categoriesFallback, productsFallback] = await Promise.all([
    categoriesError
      ? access.admin.from("menu_categories").select("id, name, description, sort_order, is_active, created_at, updated_at").eq("menu_id", access.menu.id).order("sort_order").order("created_at")
      : Promise.resolve({ data: categoriesWithEditorFields, error: null }),
    productsError
      ? access.admin.from("menu_products").select("id, category_id, name, description, price, currency_code, image_url, available, sort_order, created_at, updated_at").eq("menu_id", access.menu.id).order("sort_order").order("created_at")
      : Promise.resolve({ data: productsWithEditorFields, error: null }),
  ]);
  if (categoriesFallback.error || productsFallback.error) return NextResponse.json({ error: "No se pudo cargar el contenido del menú." }, { status: 500 });

  const { data: settingsWithEditorFields, error: settingsError } = await access.admin
    .from("digital_menus")
    .select("enabled_languages, currency_selector_enabled, banner_autoplay_seconds")
    .eq("id", access.menu.id)
    .single();
  const { data: bannersWithEditorFields, error: bannersError } = await access.admin
    .from("menu_banners")
    .select("id, image_url, eyebrow, title, description, translations, show_overlay, sort_order, is_active, created_at, updated_at")
    .eq("menu_id", access.menu.id)
    .order("sort_order")
    .order("created_at");
  const settings = settingsError
    ? { enabled_languages: ["es", "en", "pt", "fr"], currency_selector_enabled: false, banner_autoplay_seconds: 8 }
    : settingsWithEditorFields;
  const banners = bannersError ? [] : bannersWithEditorFields;

  return NextResponse.json({
    menu: { ...access.menu, ...settings },
    categories: categoriesFallback.data ?? [],
    products: productsFallback.data ?? [],
    banners: banners ?? [],
  });
}

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type PublicMenuTranslation = Record<string, { name?: string; description?: string }>;
export type PublicMenuBannerTranslation = Record<string, { eyebrow?: string; title?: string; description?: string }>;
export type PublicMenuCategory = { id: string; name: string; description: string | null; bubbleImageUrl: string | null; cardImageUrl: string | null; translations: PublicMenuTranslation; sortOrder: number };
export type PublicMenuProductPriceOption = { label: string; price: number };
export type PublicMenuProduct = { id: string; categoryId: string | null; name: string; description: string | null; sectionName: string | null; translations: PublicMenuTranslation; sectionTranslations: Record<string, string>; price: number; priceOptions: PublicMenuProductPriceOption[]; currencyCode: string; imageUrl: string | null; available: boolean; sortOrder: number };
export type PublicMenuBanner = { id: string; imageUrl: string; eyebrow: string; title: string; description: string; translations: PublicMenuBannerTranslation; showOverlay: boolean; sortOrder: number };
export type PublicDigitalMenu = { id: string; slug: string; name: string; companyName: string; enabledLanguages: string[]; currencyEnabled: boolean; bannerAutoplaySeconds: number; categories: PublicMenuCategory[]; products: PublicMenuProduct[]; banners: PublicMenuBanner[] };

function publicPriceOptions(value: unknown): PublicMenuProductPriceOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((option) => {
    if (!option || typeof option !== "object") return [];
    const record = option as Record<string, unknown>;
    const label = typeof record.label === "string" ? record.label.trim() : "";
    const price = Number(record.price);
    return label && Number.isFinite(price) && price >= 0 ? [{ label, price }] : [];
  });
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function menuTranslations(value: unknown): PublicMenuTranslation {
  return Object.entries(objectValue(value)).reduce<PublicMenuTranslation>((translations, [language, item]) => {
    const record = objectValue(item);
    const name = typeof record.name === "string" ? record.name : undefined;
    const description = typeof record.description === "string" ? record.description : undefined;
    if (name || description) translations[language] = { ...(name ? { name } : {}), ...(description ? { description } : {}) };
    return translations;
  }, {});
}

function sectionTranslations(value: unknown): Record<string, string> {
  return Object.entries(objectValue(value)).reduce<Record<string, string>>((translations, [language, section]) => {
    if (typeof section === "string") translations[language] = section;
    return translations;
  }, {});
}

function bannerTranslations(value: unknown): PublicMenuBannerTranslation {
  return Object.entries(objectValue(value)).reduce<PublicMenuBannerTranslation>((translations, [language, item]) => {
    const record = objectValue(item);
    const eyebrow = typeof record.eyebrow === "string" ? record.eyebrow : undefined;
    const title = typeof record.title === "string" ? record.title : undefined;
    const description = typeof record.description === "string" ? record.description : undefined;
    if (eyebrow || title || description) translations[language] = { ...(eyebrow ? { eyebrow } : {}), ...(title ? { title } : {}), ...(description ? { description } : {}) };
    return translations;
  }, {});
}

export async function getPublicDigitalMenuBySlug(slug: string): Promise<PublicDigitalMenu | null> {
  const admin = createAdminClient();
  const menuResult = await admin
    .from("digital_menus")
    .select("id, company_id, name, slug, status, enabled_languages, currency_selector_enabled, banner_autoplay_seconds")
    .eq("slug", slug)
    .neq("status", "archived")
    .maybeSingle();
  const fallbackMenuResult = menuResult.error
    ? await admin.from("digital_menus").select("id, company_id, name, slug, status").eq("slug", slug).neq("status", "archived").maybeSingle()
    : null;
  const menu = (menuResult.data ?? fallbackMenuResult?.data) as Record<string, unknown> | null;
  if (!menu || typeof menu.company_id !== "string") return null;

  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("name")
    .eq("id", menu.company_id)
    .maybeSingle();
  // La placa debe poder abrir el menú que ya fue asignado a su empresa. El
  // estado de publicación se reserva para administración, no para bloquear
  // una visita legítima proveniente de una placa física.
  if (companyError || !company) return null;

  const [categoryResult, productResult, bannerResult] = await Promise.all([
    admin.from("menu_categories").select("id, name, description, bubble_image_url, card_image_url, translations, sort_order").eq("menu_id", menu.id).eq("is_active", true).order("sort_order").order("created_at"),
    admin.from("menu_products").select("id, category_id, name, description, section_name, translations, section_translations, price, price_options, currency_code, image_url, available, sort_order").eq("menu_id", menu.id).order("sort_order").order("created_at"),
    admin.from("menu_banners").select("id, image_url, eyebrow, title, description, translations, show_overlay, sort_order").eq("menu_id", menu.id).eq("is_active", true).order("sort_order").order("created_at"),
  ]);
  const categories = categoryResult.error
    ? (await admin.from("menu_categories").select("id, name, description, sort_order").eq("menu_id", menu.id).eq("is_active", true).order("sort_order").order("created_at")).data
    : categoryResult.data;
  if (!categories) return null;

  // Permite desplegar primero el frontend y aplicar la migración después sin
  // dejar inaccesible el menú público durante esa ventana de transición.
  const products = productResult.error
    ? (await admin.from("menu_products").select("id, category_id, name, description, price, currency_code, image_url, available, sort_order").eq("menu_id", menu.id).order("sort_order").order("created_at")).data
    : productResult.data;
  if (!products) return null;

  return {
    id: menu.id as string, slug: menu.slug as string, name: menu.name as string, companyName: company.name,
    enabledLanguages: Array.isArray(menu.enabled_languages) ? menu.enabled_languages.filter((language): language is string => typeof language === "string") : ["es", "en", "pt", "fr"],
    currencyEnabled: menu.currency_selector_enabled === true,
    bannerAutoplaySeconds: Number.isInteger(menu.banner_autoplay_seconds) ? Number(menu.banner_autoplay_seconds) : 8,
    categories: categories.map((category) => { const item = category as typeof category & { bubble_image_url?: string | null; card_image_url?: string | null; translations?: unknown }; return { id: item.id, name: item.name, description: item.description, bubbleImageUrl: item.bubble_image_url ?? null, cardImageUrl: item.card_image_url ?? null, translations: menuTranslations(item.translations), sortOrder: item.sort_order }; }),
    products: (products ?? []).map((product) => {
      const productWithOptions = product as typeof product & { section_name?: unknown; price_options?: unknown; translations?: unknown; section_translations?: unknown };
      return { id: product.id, categoryId: product.category_id, name: product.name, description: product.description, sectionName: typeof productWithOptions.section_name === "string" ? productWithOptions.section_name : null, translations: menuTranslations(productWithOptions.translations), sectionTranslations: sectionTranslations(productWithOptions.section_translations), price: Number(product.price), priceOptions: publicPriceOptions(productWithOptions.price_options), currencyCode: product.currency_code, imageUrl: product.image_url, available: product.available, sortOrder: product.sort_order };
    }),
    banners: (bannerResult.data ?? []).map((banner) => ({ id: banner.id, imageUrl: banner.image_url, eyebrow: banner.eyebrow ?? "", title: banner.title ?? "", description: banner.description ?? "", translations: bannerTranslations(banner.translations), showOverlay: banner.show_overlay, sortOrder: banner.sort_order })),
  };
}

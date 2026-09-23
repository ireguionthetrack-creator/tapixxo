import { NextResponse } from "next/server";
import { getCompanyDigitalMenuAccess } from "@/lib/digital-menu/access";
import { imageUrl, isUuid, menuPrice, menuTranslations, sectionTranslations, sortOrder, text } from "@/lib/digital-menu/validation";

export async function POST(request: Request, { params }: RouteContext<"/api/companies/[id]/digital-menu/products">) {
  const { id } = await params;
  const access = await getCompanyDigitalMenuAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    const body = await request.json();
    const categoryId = body.categoryId ? String(body.categoryId) : null;
    if (categoryId && !isUuid(categoryId)) throw new Error("La categoría no es válida.");
    if (categoryId) {
      const { data: category } = await access.admin.from("menu_categories").select("id").eq("id", categoryId).eq("menu_id", access.menu.id).maybeSingle();
      if (!category) throw new Error("La categoría no pertenece a este menú.");
    }
    const { data, error } = await access.admin.from("menu_products").insert({
      menu_id: access.menu.id, category_id: categoryId, name: text(body.name, 140, "El nombre", true),
      description: text(body.description, 1200, "La descripción"), section_name: text(body.sectionName, 100, "La subcategoría"),
      translations: menuTranslations(body.translations, 140, 1200), section_translations: sectionTranslations(body.sectionTranslations), price: menuPrice(body.price),
      currency_code: "COP", image_url: imageUrl(body.imageUrl), available: body.available !== false, sort_order: sortOrder(body.sortOrder),
    }).select("id, category_id, name, description, section_name, translations, section_translations, price, currency_code, image_url, available, sort_order, created_at, updated_at").single();
    if (error) return NextResponse.json({ error: "No se pudo crear el producto." }, { status: 500 });
    return NextResponse.json({ product: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "El producto no es válido." }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { getCompanyDigitalMenuAccess } from "@/lib/digital-menu/access";
import { imageUrl, isUuid, menuPrice, menuTranslations, sectionTranslations, sortOrder, text } from "@/lib/digital-menu/validation";

async function productAccess(companyId: string, productId: string) {
  if (!isUuid(productId)) return { error: "El producto no es válido.", status: 400 as const };
  const access = await getCompanyDigitalMenuAccess(companyId);
  if ("error" in access) return access;
  const { data: product } = await access.admin.from("menu_products").select("id").eq("id", productId).eq("menu_id", access.menu.id).maybeSingle();
  if (!product) return { error: "El producto no existe.", status: 404 as const };
  return access;
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/companies/[id]/digital-menu/products/[productId]">) {
  const { id, productId } = await params;
  const access = await productAccess(id, productId);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    const body = await request.json();
    const categoryId = body.categoryId ? String(body.categoryId) : null;
    if (categoryId && !isUuid(categoryId)) throw new Error("La categoría no es válida.");
    if (categoryId) {
      const { data: category } = await access.admin.from("menu_categories").select("id").eq("id", categoryId).eq("menu_id", access.menu.id).maybeSingle();
      if (!category) throw new Error("La categoría no pertenece a este menú.");
    }
    const { data, error } = await access.admin.from("menu_products").update({
      category_id: categoryId, name: text(body.name, 140, "El nombre", true), description: text(body.description, 1200, "La descripción"), section_name: text(body.sectionName, 100, "La subcategoría"),
      translations: menuTranslations(body.translations, 140, 1200), section_translations: sectionTranslations(body.sectionTranslations),
      price: menuPrice(body.price), currency_code: "COP", image_url: imageUrl(body.imageUrl), available: body.available !== false, sort_order: sortOrder(body.sortOrder),
    }).eq("id", productId).select("id, category_id, name, description, section_name, translations, section_translations, price, currency_code, image_url, available, sort_order, created_at, updated_at").single();
    if (error) return NextResponse.json({ error: "No se pudo actualizar el producto." }, { status: 500 });
    return NextResponse.json({ product: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "El producto no es válido." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext<"/api/companies/[id]/digital-menu/products/[productId]">) {
  const { id, productId } = await params;
  const access = await productAccess(id, productId);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { error } = await access.admin.from("menu_products").delete().eq("id", productId);
  if (error) return NextResponse.json({ error: "No se pudo eliminar el producto." }, { status: 500 });
  return NextResponse.json({ success: true });
}

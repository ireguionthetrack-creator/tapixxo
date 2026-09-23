import { NextResponse } from "next/server";
import { getCompanyDigitalMenuAccess } from "@/lib/digital-menu/access";
import { imageUrl, isUuid, menuTranslations, sortOrder, text } from "@/lib/digital-menu/validation";

async function categoryAccess(companyId: string, categoryId: string) {
  if (!isUuid(categoryId)) return { error: "La categoría no es válida.", status: 400 as const };
  const access = await getCompanyDigitalMenuAccess(companyId);
  if ("error" in access) return access;
  const { data: category } = await access.admin.from("menu_categories").select("id").eq("id", categoryId).eq("menu_id", access.menu.id).maybeSingle();
  if (!category) return { error: "La categoría no existe.", status: 404 as const };
  return access;
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/companies/[id]/digital-menu/categories/[categoryId]">) {
  const { id, categoryId } = await params;
  const access = await categoryAccess(id, categoryId);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    const body = await request.json();
    const { data, error } = await access.admin.from("menu_categories").update({
      name: text(body.name, 100, "El nombre", true), description: text(body.description, 500, "La descripción"),
      bubble_image_url: imageUrl(body.bubbleImageUrl), card_image_url: imageUrl(body.cardImageUrl), translations: menuTranslations(body.translations, 100, 500),
      sort_order: sortOrder(body.sortOrder), is_active: body.isActive !== false,
    }).eq("id", categoryId).select("id, name, description, bubble_image_url, card_image_url, translations, sort_order, is_active, created_at, updated_at").single();
    if (error) return NextResponse.json({ error: "No se pudo actualizar la categoría." }, { status: 500 });
    return NextResponse.json({ category: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "La categoría no es válida." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext<"/api/companies/[id]/digital-menu/categories/[categoryId]">) {
  const { id, categoryId } = await params;
  const access = await categoryAccess(id, categoryId);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { error } = await access.admin.from("menu_categories").delete().eq("id", categoryId);
  if (error) return NextResponse.json({ error: "No se pudo eliminar la categoría." }, { status: 500 });
  return NextResponse.json({ success: true });
}

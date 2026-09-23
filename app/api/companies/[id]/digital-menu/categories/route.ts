import { NextResponse } from "next/server";
import { getCompanyDigitalMenuAccess } from "@/lib/digital-menu/access";
import { imageUrl, menuTranslations, sortOrder, text } from "@/lib/digital-menu/validation";

export async function POST(request: Request, { params }: RouteContext<"/api/companies/[id]/digital-menu/categories">) {
  const { id } = await params;
  const access = await getCompanyDigitalMenuAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    const body = await request.json();
    const { data, error } = await access.admin.from("menu_categories").insert({
      menu_id: access.menu.id,
      name: text(body.name, 100, "El nombre", true),
      description: text(body.description, 500, "La descripción"),
      bubble_image_url: imageUrl(body.bubbleImageUrl),
      card_image_url: imageUrl(body.cardImageUrl),
      translations: menuTranslations(body.translations, 100, 500),
      sort_order: sortOrder(body.sortOrder),
      is_active: body.isActive !== false,
    }).select("id, name, description, bubble_image_url, card_image_url, translations, sort_order, is_active, created_at, updated_at").single();
    if (error) return NextResponse.json({ error: "No se pudo crear la categoría." }, { status: 500 });
    return NextResponse.json({ category: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "La categoría no es válida." }, { status: 400 });
  }
}

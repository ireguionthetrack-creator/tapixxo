import { NextResponse } from "next/server";
import { getCompanyDigitalMenuAccess } from "@/lib/digital-menu/access";
import { bannerTranslations, imageUrl, sortOrder, text } from "@/lib/digital-menu/validation";

const FIELDS = "id, image_url, eyebrow, title, description, translations, show_overlay, sort_order, is_active, created_at, updated_at";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getCompanyDigitalMenuAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    const body = await request.json();
    const image = imageUrl(body.imageUrl);
    if (!image) throw new Error("La imagen del banner es obligatoria.");
    const { data, error } = await access.admin.from("menu_banners").insert({
      menu_id: access.menu.id, image_url: image, eyebrow: text(body.eyebrow, 120, "El texto superior"), title: text(body.title, 160, "El título"),
      description: text(body.description, 500, "La descripción"), translations: bannerTranslations(body.translations), show_overlay: body.showOverlay !== false,
      sort_order: sortOrder(body.sortOrder), is_active: body.isActive !== false,
    }).select(FIELDS).single();
    if (error) return NextResponse.json({ error: "No se pudo crear el banner." }, { status: 500 });
    return NextResponse.json({ banner: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "El banner no es válido." }, { status: 400 });
  }
}

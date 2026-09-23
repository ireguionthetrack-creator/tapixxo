import { NextResponse } from "next/server";
import { getCompanyDigitalMenuAccess } from "@/lib/digital-menu/access";
import { bannerTranslations, imageUrl, isUuid, sortOrder, text } from "@/lib/digital-menu/validation";

const FIELDS = "id, image_url, eyebrow, title, description, translations, show_overlay, sort_order, is_active, created_at, updated_at";

async function bannerAccess(companyId: string, bannerId: string) {
  if (!isUuid(bannerId)) return { error: "El banner no es válido.", status: 400 as const };
  const access = await getCompanyDigitalMenuAccess(companyId);
  if ("error" in access) return access;
  const { data: banner } = await access.admin.from("menu_banners").select("id").eq("id", bannerId).eq("menu_id", access.menu.id).maybeSingle();
  if (!banner) return { error: "El banner no existe.", status: 404 as const };
  return access;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; bannerId: string }> }) {
  const { id, bannerId } = await params;
  const access = await bannerAccess(id, bannerId);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    const body = await request.json();
    const image = imageUrl(body.imageUrl);
    if (!image) throw new Error("La imagen del banner es obligatoria.");
    const { data, error } = await access.admin.from("menu_banners").update({
      image_url: image, eyebrow: text(body.eyebrow, 120, "El texto superior"), title: text(body.title, 160, "El título"),
      description: text(body.description, 500, "La descripción"), translations: bannerTranslations(body.translations), show_overlay: body.showOverlay !== false,
      sort_order: sortOrder(body.sortOrder), is_active: body.isActive !== false,
    }).eq("id", bannerId).select(FIELDS).single();
    if (error) return NextResponse.json({ error: "No se pudo actualizar el banner." }, { status: 500 });
    return NextResponse.json({ banner: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "El banner no es válido." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; bannerId: string }> }) {
  const { id, bannerId } = await params;
  const access = await bannerAccess(id, bannerId);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { error } = await access.admin.from("menu_banners").delete().eq("id", bannerId);
  if (error) return NextResponse.json({ error: "No se pudo eliminar el banner." }, { status: 500 });
  return NextResponse.json({ success: true });
}

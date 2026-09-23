import { NextResponse } from "next/server";
import { getCompanyDigitalMenuAccess } from "@/lib/digital-menu/access";
import { menuLanguages } from "@/lib/digital-menu/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getCompanyDigitalMenuAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    const body = await request.json();
    if (typeof body.currencyEnabled !== "boolean") throw new Error("Indica si se mostrará la divisa.");
    const autoplaySeconds = Number(body.bannerAutoplaySeconds);
    if (!Number.isInteger(autoplaySeconds) || autoplaySeconds < 5 || autoplaySeconds > 45) throw new Error("El desplazamiento del banner debe estar entre 5 y 45 segundos.");
    const { data, error } = await access.admin.from("digital_menus").update({
      enabled_languages: menuLanguages(body.enabledLanguages),
      currency_selector_enabled: body.currencyEnabled,
      banner_autoplay_seconds: autoplaySeconds,
    }).eq("id", access.menu.id).select("enabled_languages, currency_selector_enabled, banner_autoplay_seconds").single();
    if (error) return NextResponse.json({ error: "No se pudieron guardar los ajustes." }, { status: 500 });
    return NextResponse.json({ settings: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Los ajustes no son válidos." }, { status: 400 });
  }
}

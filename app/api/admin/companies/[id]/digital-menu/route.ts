import { NextResponse } from "next/server";
import { getDigitalMenuAdminAccess } from "@/lib/digital-menu/access";
import { isUuid, menuSlug, text } from "@/lib/digital-menu/validation";

async function accessForCompany(companyId: string) {
  if (!isUuid(companyId)) return { error: "La empresa no es válida.", status: 400 as const };
  const access = await getDigitalMenuAdminAccess();
  if ("error" in access) return access;
  const { data: company, error } = await access.admin
    .from("companies")
    .select("id, name, menu_digital_enabled")
    .eq("id", companyId)
    .maybeSingle();
  if (error) return { error: "No se pudo consultar la empresa.", status: 500 as const };
  if (!company) return { error: "La empresa no existe.", status: 404 as const };
  return { ...access, company };
}

export async function GET(_request: Request, { params }: RouteContext<"/api/admin/companies/[id]/digital-menu">) {
  const { id } = await params;
  const access = await accessForCompany(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const { data: menus, error } = await access.admin
    .from("digital_menus")
    .select("id, company_id, name, slug, status, updated_at")
    .order("name");
  if (error) return NextResponse.json({ error: "No se pudieron cargar los menús." }, { status: 500 });
  return NextResponse.json({ company: access.company, menus: menus ?? [] });
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/admin/companies/[id]/digital-menu">) {
  const { id } = await params;
  const access = await accessForCompany(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await request.json().catch(() => null);
  if (typeof body?.enabled !== "boolean") return NextResponse.json({ error: "Indica si el módulo está activado." }, { status: 400 });

  const { error } = await access.admin.from("companies").update({ menu_digital_enabled: body.enabled }).eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo actualizar el módulo." }, { status: 500 });
  const { data: assignedMenu } = await access.admin.from("digital_menus").select("id").eq("company_id", id).maybeSingle();
  await access.admin.from("digital_menu_audit_log").insert({
    menu_id: assignedMenu?.id ?? null,
    actor_id: access.userId,
    action: body.enabled ? "feature_enabled" : "feature_disabled",
    to_company_id: id,
  });
  return NextResponse.json({ enabled: body.enabled });
}

export async function POST(request: Request, { params }: RouteContext<"/api/admin/companies/[id]/digital-menu">) {
  const { id } = await params;
  const access = await accessForCompany(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await request.json().catch(() => null);

  try {
    if (body?.action === "create") {
      const name = text(body.name, 120, "El nombre", true)!;
      const slug = menuSlug(body.slug);
      const { data: menu, error } = await access.admin
        .from("digital_menus")
        .insert({ name, slug })
        .select("id, name, slug")
        .single();
      if (error || !menu) {
        const message = error?.code === "23505" ? "Ese slug ya está en uso." : "No se pudo crear el menú.";
        return NextResponse.json({ error: message }, { status: 409 });
      }
      const { error: assignmentError } = await access.admin.rpc("assign_digital_menu", {
        p_menu_id: menu.id, p_company_id: id, p_actor_id: access.userId,
      });
      if (assignmentError) return NextResponse.json({ error: "El menú fue creado, pero no se pudo asignar." }, { status: 500 });
      await access.admin.from("digital_menu_audit_log").insert({ menu_id: menu.id, actor_id: access.userId, action: "created", to_company_id: id });
      return NextResponse.json({ menu }, { status: 201 });
    }

    if (body?.action === "assign") {
      if (!isUuid(String(body.menuId ?? ""))) throw new Error("El menú seleccionado no es válido.");
      const { error } = await access.admin.rpc("assign_digital_menu", {
        p_menu_id: body.menuId, p_company_id: id, p_actor_id: access.userId,
      });
      if (error) return NextResponse.json({ error: "No se pudo asignar el menú." }, { status: error.code === "P0002" ? 404 : 500 });
      return NextResponse.json({ success: true });
    }

    if (body?.action === "unassign") {
      if (!isUuid(String(body.menuId ?? ""))) throw new Error("El menú seleccionado no es válido.");
      const { error } = await access.admin.rpc("unassign_digital_menu", { p_menu_id: body.menuId, p_actor_id: access.userId });
      if (error) return NextResponse.json({ error: "No se pudo desasignar el menú." }, { status: 500 });
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "La acción solicitada no es válida." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "La solicitud no es válida." }, { status: 400 });
  }
}

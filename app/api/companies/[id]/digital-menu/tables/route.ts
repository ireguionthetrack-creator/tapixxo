import { NextResponse } from "next/server";
import { getCompanyDigitalMenuAccess } from "@/lib/digital-menu/access";
import { isUuid, text } from "@/lib/digital-menu/validation";
import { createAdminClient } from "@/lib/supabase/admin";

type CompanyCode = { id: string; code: string; active: boolean; company_id: string | null; group_id: string | null };

async function companyCodes(companyId: string, admin: ReturnType<typeof createAdminClient>) {
  const [{ data: directCodes, error: directError }, { data: groups, error: groupsError }] = await Promise.all([
    admin.from("codes").select("id, code, active, company_id, group_id").eq("company_id", companyId).order("code"),
    admin.from("code_groups").select("id").eq("company_id", companyId),
  ]);
  if (directError || groupsError) return { error: true, codes: [] as CompanyCode[] };
  const groupIds = (groups ?? []).map((group) => group.id);
  const { data: groupCodes, error: groupCodesError } = groupIds.length
    ? await admin.from("codes").select("id, code, active, company_id, group_id").in("group_id", groupIds).order("code")
    : { data: [] as CompanyCode[], error: null };
  if (groupCodesError) return { error: true, codes: [] as CompanyCode[] };
  const codes = new Map<string, CompanyCode>();
  [...(directCodes ?? []), ...(groupCodes ?? [])].forEach((code) => codes.set(code.id, code as CompanyCode));
  return { error: false, codes: [...codes.values()].sort((left, right) => left.code.localeCompare(right.code, "es")) };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getCompanyDigitalMenuAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const codeResult = await companyCodes(id, access.admin);
  if (codeResult.error) return NextResponse.json({ error: "No se pudieron cargar las placas de la empresa." }, { status: 500 });
  const { data: assignments, error } = await access.admin
    .from("digital_menu_table_assignments")
    .select("id, code_id, table_label, updated_at")
    .eq("menu_id", access.menu.id)
    .eq("company_id", id);
  if (error) return NextResponse.json({ error: "No se pudieron cargar las mesas. Aplica la migración de asignación de mesas." }, { status: 503 });
  const byCodeId = new Map((assignments ?? []).map((assignment) => [assignment.code_id, assignment]));
  return NextResponse.json({
    plates: codeResult.codes.map((code) => ({
      ...code,
      assignment: byCodeId.get(code.id) ?? null,
    })),
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getCompanyDigitalMenuAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    const body = await request.json() as { codeId?: unknown; tableLabel?: unknown };
    const codeId = typeof body.codeId === "string" ? body.codeId : "";
    if (!isUuid(codeId)) return NextResponse.json({ error: "La placa no es válida." }, { status: 400 });
    const label = text(body.tableLabel, 120, "El nombre de la mesa", true);
    const codeResult = await companyCodes(id, access.admin);
    if (codeResult.error) return NextResponse.json({ error: "No se pudo comprobar la placa." }, { status: 500 });
    if (!codeResult.codes.some((code) => code.id === codeId)) return NextResponse.json({ error: "La placa no pertenece a esta empresa." }, { status: 403 });
    const { data, error } = await access.admin.from("digital_menu_table_assignments").upsert({
      menu_id: access.menu.id, company_id: id, code_id: codeId, table_label: label,
    }, { onConflict: "menu_id,code_id" }).select("id, code_id, table_label, updated_at").single();
    if (error) return NextResponse.json({ error: "No se pudo guardar la asignación de mesa." }, { status: 500 });
    return NextResponse.json({ assignment: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "La mesa no es válida." }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getCompanyDigitalMenuAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const codeId = new URL(request.url).searchParams.get("codeId") ?? "";
  if (!isUuid(codeId)) return NextResponse.json({ error: "La placa no es válida." }, { status: 400 });
  const { error } = await access.admin.from("digital_menu_table_assignments")
    .delete().eq("menu_id", access.menu.id).eq("company_id", id).eq("code_id", codeId);
  if (error) return NextResponse.json({ error: "No se pudo quitar la asignación de mesa." }, { status: 500 });
  return NextResponse.json({ success: true });
}

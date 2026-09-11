import { NextResponse } from "next/server";
import { getCompanyGroupManagementAccess } from "@/lib/company-group-management";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const access = await getCompanyGroupManagementAccess(companyId);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { data, error } = await access.admin
    .from("code_schedules")
    .select("id,name,enabled,schedule_kind,schedule_date,apply_to_future_plates,code_schedule_assignments(code_id)")
    .eq("company_id", companyId).order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Falta aplicar la migración de programación masiva." }, { status: 503 });
  return NextResponse.json({ schedules: data ?? [] });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const access = await getCompanyGroupManagementAccess(companyId);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const ids = Array.isArray(body?.codeIds) ? body.codeIds.filter((id: unknown): id is string => typeof id === "string" && UUID.test(id)) : [];
  if (!body || ids.length === 0 || ids.length !== (body.codeIds as unknown[]).length || ids.length > 1000) return NextResponse.json({ error: "Selecciona placas válidas." }, { status: 400 });
  const { data, error } = await access.admin.rpc("save_company_shared_code_schedule", {
    p_company_id: companyId, p_schedule_id: typeof body.scheduleId === "string" && UUID.test(body.scheduleId) ? body.scheduleId : null,
    p_name: typeof body.name === "string" ? body.name.slice(0, 120) : null,
    p_enabled: body.enabled === true, p_schedule_kind: body.scheduleKind,
    p_schedule_date: body.scheduleKind === "date" && typeof body.scheduleDate === "string" ? body.scheduleDate : null,
    p_after_behavior: "default_destination", p_after_custom_destination_url: null,
    p_time_zone: body.timeZone, p_apply_to_future_plates: body.applyToFuturePlates === true,
    p_code_ids: ids, p_replace_conflicts: body.replaceConflicts === true, p_rules: body.rules,
  }).maybeSingle();
  if (error) {
    console.error("Shared schedule save failed", { code: error.code, message: error.message });
    const conflict = /already have an active schedule/i.test(error.message);
    return NextResponse.json({ error: conflict ? "Una o más placas ya tienen una programación activa." : "No se pudo guardar la programación.", conflict } , { status: conflict ? 409 : 400 });
  }
  return NextResponse.json(data ?? {});
}

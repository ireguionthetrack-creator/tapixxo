import { NextResponse } from "next/server";
import { getCompanyGroupManagementAccess } from "@/lib/company-group-management";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const URL_PATTERN = /^https?:\/\/[^\s]+$/i;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

type RuleInput = {
  startTime?: unknown;
  endTime?: unknown;
  destinationType?: unknown;
  destinationUrl?: unknown;
};

type ScheduleBody = {
  enabled?: unknown;
  scheduleKind?: unknown;
  scheduleDate?: unknown;
  afterBehavior?: unknown;
  afterCustomDestinationUrl?: unknown;
  timeZone?: unknown;
  rules?: unknown;
};

function isSafeUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 2000 || !URL_PATTERN.test(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function parseBody(body: ScheduleBody) {
  const enabled = body.enabled === true;
  const scheduleKind = body.scheduleKind;
  const scheduleDate = body.scheduleDate;
  const afterBehavior = body.afterBehavior;
  const customAfter = body.afterCustomDestinationUrl;
  const timeZone = body.timeZone;
  const rawRules = body.rules;

  if (
    typeof scheduleKind !== "string" ||
    !["daily", "date"].includes(scheduleKind) ||
    typeof afterBehavior !== "string" ||
    !["keep_last", "default_destination", "custom_destination"].includes(afterBehavior) ||
    typeof timeZone !== "string" ||
    timeZone.length > 100 ||
    !Array.isArray(rawRules) ||
    rawRules.length === 0 ||
    rawRules.length > 24
  ) {
    return null;
  }

  if (
    (scheduleKind === "date" &&
      (typeof scheduleDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(scheduleDate))) ||
    (scheduleKind === "daily" && scheduleDate !== null)
  ) {
    return null;
  }

  if (
    afterBehavior === "custom_destination" &&
    !isSafeUrl(customAfter)
  ) {
    return null;
  }

  const rules = rawRules.map((rawRule) => {
    const rule = rawRule as RuleInput;
    const destinationType = rule.destinationType;
    const needsUrl = destinationType === "whatsapp" || destinationType === "custom";
    if (
      !rule ||
      typeof rule.startTime !== "string" ||
      typeof rule.endTime !== "string" ||
      !TIME_PATTERN.test(rule.startTime) ||
      !TIME_PATTERN.test(rule.endTime) ||
      rule.startTime === rule.endTime ||
      typeof destinationType !== "string" ||
      !["primary", "google_reviews", "whatsapp", "custom"].includes(destinationType) ||
      (needsUrl && !isSafeUrl(rule.destinationUrl))
    ) {
      return null;
    }

    return {
      startTime: rule.startTime,
      endTime: rule.endTime,
      destinationType,
      destinationUrl: needsUrl ? String(rule.destinationUrl) : null,
    };
  });

  if (rules.some((rule) => rule === null)) return null;

  return {
    enabled,
    scheduleKind,
    scheduleDate: scheduleKind === "date" ? scheduleDate : null,
    afterBehavior,
    afterCustomDestinationUrl:
      afterBehavior === "custom_destination" ? String(customAfter) : null,
    timeZone,
    rules,
  };
}

async function getAccess(
  params: Promise<{ id: string; codeId: string }>
) {
  const { id: companyId, codeId } = await params;
  if (!UUID_PATTERN.test(codeId)) {
    return { companyId, codeId, error: "La placa no es válida.", status: 400 as const };
  }

  const access = await getCompanyGroupManagementAccess(companyId);
  if ("error" in access) return { companyId, codeId, ...access };
  return { ...access, companyId, codeId };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; codeId: string }> }
) {
  const access = await getAccess(params);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data: code, error: codeError } = await access.admin
    .from("codes")
    .select("id, code, destination_url, company_id, group_id")
    .eq("id", access.codeId)
    .maybeSingle();

  if (codeError) {
    console.error("Schedule code lookup failed", { code: codeError.code, message: codeError.message });
    return NextResponse.json({ error: "No se pudo consultar la placa." }, { status: 500 });
  }
  if (!code) return NextResponse.json({ error: "La placa no existe." }, { status: 404 });

  const { data: group } = code.company_id
    ? { data: null }
    : await access.admin
        .from("code_groups")
        .select("company_id")
        .eq("id", code.group_id)
        .maybeSingle();
  if ((code.company_id ?? group?.company_id) !== access.companyId) {
    return NextResponse.json({ error: "No puedes gestionar esta placa." }, { status: 403 });
  }

  const [{ data: company, error: companyError }, { data: schedule, error: scheduleError }, { data: googleDestination }] =
    await Promise.all([
      access.admin.from("companies").select("time_zone").eq("id", access.companyId).maybeSingle(),
      access.admin
        .from("code_schedule_assignments")
        .select("schedule_id, code_schedules!inner(id, enabled, schedule_kind, schedule_date, after_behavior, after_custom_destination_url, name, apply_to_future_plates, code_schedule_rules(id, start_time, end_time, destination_type, destination_url, sort_order))")
        .eq("code_id", access.codeId)
        .maybeSingle(),
      access.admin
        .from("company_google_review_destinations")
        .select("review_url")
        .eq("company_id", access.companyId)
        .maybeSingle(),
    ]);

  if (companyError || scheduleError) {
    console.error("Schedule load failed", {
      companyCode: companyError?.code,
      scheduleCode: scheduleError?.code,
      companyMessage: companyError?.message,
      scheduleMessage: scheduleError?.message,
    });
    return NextResponse.json(
      { error: "Falta aplicar la migración de destinos por horario." },
      { status: 503 }
    );
  }

  return NextResponse.json({
    timeZone: company?.time_zone ?? null,
    primaryDestinationUrl: code.destination_url,
    googleReviewUrl: googleDestination?.review_url ?? null,
    schedule: schedule?.code_schedules ?? null,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; codeId: string }> }
) {
  const access = await getAccess(params);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let payload: ScheduleBody;
  try {
    payload = (await request.json()) as ScheduleBody;
  } catch {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  const body = parseBody(payload);
  if (!body) {
    return NextResponse.json({ error: "La programación contiene valores no válidos." }, { status: 400 });
  }

  const { data, error } = await access.admin.rpc("replace_company_code_schedule", {
    p_company_id: access.companyId,
    p_code_id: access.codeId,
    p_enabled: body.enabled,
    p_schedule_kind: body.scheduleKind,
    p_schedule_date: body.scheduleDate,
    p_after_behavior: body.afterBehavior,
    p_after_custom_destination_url: body.afterCustomDestinationUrl,
    p_time_zone: body.timeZone,
    p_rules: body.rules,
  }).maybeSingle();

  if (error) {
    console.error("Schedule save failed", { code: error.code, message: error.message });
    const knownUserError = /invalid|overlap|does not belong|destination/i.test(error.message);
    return NextResponse.json(
      { error: knownUserError ? "Revisa los horarios, la zona horaria y los destinos seleccionados." : "No se pudo guardar la programación." },
      { status: knownUserError ? 400 : 500 }
    );
  }

  return NextResponse.json({ scheduleId: (data as { schedule_id?: string } | null)?.schedule_id ?? null });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; codeId: string }> }
) {
  const access = await getAccess(params);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data: assignment, error: assignmentError } = await access.admin
    .from("code_schedule_assignments")
    .select("id, code_schedules!inner(company_id)")
    .eq("code_id", access.codeId)
    .maybeSingle();
  if (assignmentError || !assignment || (assignment.code_schedules as { company_id?: string } | null)?.company_id !== access.companyId) {
    return NextResponse.json({ error: "No se encontró una programación para esta placa." }, { status: 404 });
  }
  const { error } = await access.admin.from("code_schedule_assignments").delete().eq("id", assignment.id);
  if (error) {
    console.error("Schedule delete failed", { code: error.code, message: error.message });
    return NextResponse.json({ error: "No se pudo eliminar la programación." }, { status: 500 });
  }
  return NextResponse.json({ deleted: true });
}

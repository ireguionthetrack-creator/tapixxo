import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PLATE_PATTERN = /^[A-Za-z]+[1-9]\d*$/;
const REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ResolvedCodeDestination = {
  code_id: string;
  code: string;
  destination_url: string | null;
  active: boolean;
  company_id: string | null;
};

function tableLabelForTexasCode(code: string) {
  const match = /^T(\d+)$/i.exec(code);
  if (!match) return `Mesa ${code}`;

  const sequence = Number(match[1]);
  // Las placas Texas usan la serie T1001 para Mesa 1, T1002 para Mesa 2, etc.
  return Number.isSafeInteger(sequence) && sequence >= 1001 ? `Mesa ${sequence - 1000}` : `Mesa ${code}`;
}

function isTexasMenuDestination(destinationUrl: string, requestUrl: string) {
  try {
    return new URL(destinationUrl, requestUrl).pathname === "/menu/texasrestobar";
  } catch {
    return false;
  }
}

function waiterCookieName(plateCode: string) {
  return `tapixxo_waiter_${plateCode}`;
}

function statusResponse(status: "idle" | "pending", tableLabel?: string) {
  const response = NextResponse.json({ status, ...(tableLabel ? { tableLabel } : {}) });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const plateCode = request.nextUrl.searchParams.get("plateCode")?.trim().toUpperCase() ?? "";
  if (!PLATE_PATTERN.test(plateCode)) return NextResponse.json({ error: "La placa no es válida." }, { status: 400 });

  const requestId = request.cookies.get(waiterCookieName(plateCode))?.value ?? "";
  if (!REQUEST_ID.test(requestId)) return statusResponse("idle");

  const { data, error } = await createAdminClient()
    .from("waiter_service_requests")
    .select("status, table_label, plate_code")
    .eq("id", requestId)
    .eq("plate_code", plateCode)
    .maybeSingle();
  if (error || !data || data.status !== "pending") {
    const response = statusResponse("idle");
    response.cookies.delete({ name: waiterCookieName(plateCode), path: "/api/menu/waiter-call" });
    return response;
  }
  return statusResponse("pending", data.table_label);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { plateCode?: unknown };
    const plateCode = typeof body.plateCode === "string" ? body.plateCode.trim().toUpperCase() : "";
    if (!PLATE_PATTERN.test(plateCode)) {
      return NextResponse.json({ error: "La placa no es válida." }, { status: 400 });
    }

    const cookieName = waiterCookieName(plateCode);
    const existingRequestId = request.cookies.get(cookieName)?.value ?? "";
    if (REQUEST_ID.test(existingRequestId)) {
      const { data: existing } = await createAdminClient().from("waiter_service_requests")
        .select("status, table_label, plate_code").eq("id", existingRequestId).eq("plate_code", plateCode).maybeSingle();
      if (existing?.status === "pending") return statusResponse("pending", existing.table_label);
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .rpc("resolve_public_code_destination", { p_code: plateCode, p_scanned_at: new Date().toISOString() })
      .maybeSingle();
    const resolved = data as ResolvedCodeDestination | null;
    if (error || !resolved?.active || !resolved.destination_url || !isTexasMenuDestination(resolved.destination_url, request.url)) {
      return NextResponse.json({ error: "Esta placa no corresponde al menú Texas." }, { status: 404 });
    }

    if (!resolved.company_id) {
      return NextResponse.json({ error: "La placa no está asociada a un restaurante." }, { status: 404 });
    }

    // La empresa puede dar a cada placa un nombre legible (por ejemplo,
    // "Mesa 1") desde el panel de Menú Digital. Conservamos la lectura
    // histórica de T1001 → Mesa 1 como respaldo para placas aún no asignadas.
    const { data: tableAssignment } = await admin
      .from("digital_menu_table_assignments")
      .select("table_label")
      .eq("company_id", resolved.company_id)
      .eq("code_id", resolved.code_id)
      .maybeSingle();
    const tableLabel = tableAssignment?.table_label || tableLabelForTexasCode(resolved.code);
    const { data: serviceRequest, error: serviceRequestError } = await admin.from("waiter_service_requests").insert({
      company_id: resolved.company_id,
      code_id: resolved.code_id,
      plate_code: resolved.code,
      table_label: tableLabel,
    }).select("id").single();
    if (serviceRequestError || !serviceRequest) {
      return NextResponse.json({ error: "El servicio de meseros no está disponible." }, { status: 503 });
    }

    const response = statusResponse("pending", tableLabel);
    response.cookies.set({ name: cookieName, value: serviceRequest.id, httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 12, path: "/api/menu/waiter-call" });
    return response;
  } catch {
    return NextResponse.json({ error: "No se pudo preparar la solicitud." }, { status: 500 });
  }
}

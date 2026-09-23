import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTexasWaiterPanelAccess } from "@/lib/waiter-panel/texas-access";

const REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FIELDS = "id, table_label, plate_code, status, requested_at, resolved_at";

export async function GET() {
  const access = await getTexasWaiterPanelAccess();
  if (!access) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { data, error } = await createAdminClient()
    .from("waiter_service_requests")
    .select(FIELDS)
    .eq("company_id", access.companyId)
    .order("requested_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: "No se pudieron cargar las llamadas." }, { status: 503 });

  const response = NextResponse.json({ requests: data ?? [] });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function PATCH(request: Request) {
  const access = await getTexasWaiterPanelAccess();
  if (!access) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    const body = await request.json() as { requestId?: unknown };
    const requestId = typeof body.requestId === "string" ? body.requestId : "";
    if (!REQUEST_ID.test(requestId)) return NextResponse.json({ error: "La solicitud no es válida." }, { status: 400 });

    const { data, error } = await createAdminClient()
      .from("waiter_service_requests")
      .update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: access.userId })
      .eq("id", requestId)
      .eq("company_id", access.companyId)
      .eq("status", "pending")
      .select(FIELDS)
      .maybeSingle();
    if (error || !data) return NextResponse.json({ error: "La solicitud ya fue atendida o no existe." }, { status: 404 });

    return NextResponse.json({ request: data });
  } catch {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(_request: Request, { params }: RouteContext<"/api/companies/[id]/store-code-freshness">) {
  const { id: companyId } = await params;
  if (!UUID_PATTERN.test(companyId)) return NextResponse.json({ error: "Empresa no válida." }, { status: 400 });

  const cookieStore = await cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll() {} } }
  );
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile || (profile.role !== "admin" && profile.company_id !== companyId)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { data: latestOrder, error: orderError } = await admin
    .from("store_orders")
    .select("id, assignment_completed_at")
    .eq("company_id", companyId)
    .eq("assignment_status", "assigned")
    .not("assignment_completed_at", "is", null)
    .order("assignment_completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (orderError) {
    console.error("Store freshness order lookup failed", { code: orderError.code, message: orderError.message });
    return NextResponse.json({ error: "No se pudo consultar las placas recientes." }, { status: 500 });
  }
  if (!latestOrder?.assignment_completed_at || Date.now() - new Date(latestOrder.assignment_completed_at).getTime() >= NEW_WINDOW_MS) {
    return NextResponse.json({ code_ids: [] });
  }

  const { data: orderUnits, error: unitsError } = await admin
    .from("store_order_units")
    .select("inventory_unit_id")
    .eq("store_order_id", latestOrder.id);
  if (unitsError) {
    console.error("Store freshness units lookup failed", { code: unitsError.code, message: unitsError.message });
    return NextResponse.json({ error: "No se pudo consultar las placas recientes." }, { status: 500 });
  }

  const inventoryUnitIds = (orderUnits ?? []).map((unit) => unit.inventory_unit_id);
  if (inventoryUnitIds.length === 0) return NextResponse.json({ code_ids: [] });

  const { data: inventoryUnits, error: inventoryError } = await admin
    .from("inventory_units")
    .select("code_id")
    .in("id", inventoryUnitIds)
    .eq("status", "assigned");
  if (inventoryError) {
    console.error("Store freshness inventory lookup failed", { code: inventoryError.code, message: inventoryError.message });
    return NextResponse.json({ error: "No se pudo consultar las placas recientes." }, { status: 500 });
  }

  return NextResponse.json({ code_ids: (inventoryUnits ?? []).map((unit) => unit.code_id) });
}

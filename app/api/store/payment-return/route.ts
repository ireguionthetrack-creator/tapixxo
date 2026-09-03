import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const REFERENCE_PATTERN = /^TPX-\d{6}$/;

export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference");
  if (!reference || !REFERENCE_PATTERN.test(reference)) {
    return NextResponse.json({ error: "Referencia de pedido no válida." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll() {} } }
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();

  const supabaseAdmin = createAdminClient();
  const { data: order, error } = await supabaseAdmin
    .from("store_orders")
    .select("order_reference, user_id, company_id, payment_status, stock_capture_status, assignment_status")
    .eq("order_reference", reference)
    .maybeSingle();

  if (error) {
    console.error("Store payment return lookup failed", { code: error.code, message: error.message });
    return NextResponse.json({ error: "No se pudo consultar el estado del pedido." }, { status: 500 });
  }
  if (!order) return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });

  if (order.user_id && order.user_id !== user?.id) {
    return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    reference: order.order_reference,
    audience: order.user_id ? "authenticated" : "guest",
    company_id: order.company_id,
    payment_status: order.payment_status,
    stock_capture_status: order.stock_capture_status,
    assignment_status: order.assignment_status,
  });
}

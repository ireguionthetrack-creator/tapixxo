import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createGuestClaimToken,
  GUEST_CLAIM_COOKIE,
  guestClaimCookieOptions,
  hashGuestClaimToken,
} from "@/lib/store/guest-claim";

export const dynamic = "force-dynamic";

const REFERENCE_PATTERN = /^TPX-\d{6}$/;
const TRANSACTION_ID_PATTERN = /^[A-Za-z0-9-]{8,128}$/;

type ReturnLookup = {
  outcome?: string;
  order_reference?: string;
  audience?: "authenticated" | "guest";
  email?: string | null;
  business_name?: string | null;
  company_id?: string | null;
  payment_status?: string;
  stock_capture_status?: string;
  assignment_status?: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference");
  const transactionId = url.searchParams.get("id");
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

  const savedToken = cookieStore.get(GUEST_CLAIM_COOKIE)?.value;
  let claimToken = savedToken ?? null;
  let claimTokenHash = claimToken ? hashGuestClaimToken(claimToken) : null;

  // Los pedidos anteriores al cookie claim (como TPX-000013) pueden canjear
  // el identificador opaco devuelto por Wompi una sola vez para emitirlo.
  if (!claimTokenHash && transactionId && TRANSACTION_ID_PATTERN.test(transactionId)) {
    claimToken = createGuestClaimToken();
    claimTokenHash = hashGuestClaimToken(claimToken);
  }

  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin
    .rpc("resolve_guest_store_order_claim", {
      p_order_reference: reference,
      p_authenticated_user_id: user?.id ?? null,
      p_claim_token_hash: claimTokenHash,
      p_provider_transaction_id:
        transactionId && TRANSACTION_ID_PATTERN.test(transactionId) ? transactionId : null,
    })
    .maybeSingle();

  if (error) {
    console.error("Store payment return lookup failed", { code: error.code, message: error.message });
    return NextResponse.json({ error: "No se pudo consultar el estado del pedido." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "No se pudo consultar el estado del pedido." }, { status: 500 });
  }

  const order = data as ReturnLookup;
  if (order.outcome === "not_authorized" || order.outcome === "order_not_found") {
    return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
  }

  const response = NextResponse.json({
    reference: order.order_reference,
    audience: order.audience,
    email: order.email ?? null,
    business_name: order.business_name ?? null,
    company_id: order.company_id ?? null,
    payment_status: order.payment_status,
    stock_capture_status: order.stock_capture_status,
    assignment_status: order.assignment_status,
  });

  if (claimToken && claimTokenHash && order.audience === "guest") {
    response.cookies.set(GUEST_CLAIM_COOKIE, claimToken, guestClaimCookieOptions());
  }
  return response;
}

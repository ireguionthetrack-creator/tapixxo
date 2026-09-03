import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createWompiIntegritySignature,
  getWompiSandboxConfig,
  toPositiveAmountInCents,
  wompiSandboxCheckoutUrl,
} from "@/lib/wompi/sandbox";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CheckoutStartBody = { order_id?: unknown };

function logSupabaseFailure(stage: "read_order" | "prepare_payment", error: unknown, orderId: string) {
  const supabaseError =
    typeof error === "object" && error !== null
      ? (error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown })
      : null;

  console.error(
    `Wompi Sandbox Supabase operation failed ${JSON.stringify({
      stage,
      orderId,
      code: typeof supabaseError?.code === "string" ? supabaseError.code : null,
      message: typeof supabaseError?.message === "string" ? supabaseError.message : null,
      details: typeof supabaseError?.details === "string" ? supabaseError.details : null,
      hint: typeof supabaseError?.hint === "string" ? supabaseError.hint : null,
    })}`
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutStartBody;
    if (typeof body.order_id !== "string" || !UUID_PATTERN.test(body.order_id)) {
      return NextResponse.json({ error: "El pedido no es válido." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: order, error: orderError } = await supabase
      .from("store_orders")
      .select(
        "id, order_reference, total_cop, currency, payment_status, payment_provider, payment_reference"
      )
      .eq("id", body.order_id)
      .maybeSingle();

    if (orderError) {
      logSupabaseFailure("read_order", orderError, body.order_id);
      return NextResponse.json({ error: "No se pudo consultar el pedido." }, { status: 500 });
    }
    if (!order) return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
    if (order.payment_status !== "pending") {
      return NextResponse.json({ error: "Este pedido ya no está pendiente de pago." }, { status: 409 });
    }
    if (order.currency !== "COP") {
      console.warn("Wompi checkout rejected currency", { orderReference: order.order_reference });
      return NextResponse.json({ error: "La moneda del pedido no es compatible." }, { status: 409 });
    }
    if (order.payment_provider && order.payment_provider !== "wompi") {
      console.warn("Wompi checkout rejected provider", { orderReference: order.order_reference });
      return NextResponse.json({ error: "El pedido usa otro proveedor de pago." }, { status: 409 });
    }
    if (order.payment_reference && order.payment_reference !== order.order_reference) {
      console.warn("Wompi checkout rejected reference", { orderReference: order.order_reference });
      return NextResponse.json({ error: "La referencia de pago del pedido no es válida." }, { status: 409 });
    }

    const amountInCents = toPositiveAmountInCents(order.total_cop);
    const config = getWompiSandboxConfig();
    const integritySignature = createWompiIntegritySignature(
      order.order_reference,
      amountInCents,
      order.currency,
      config.integritySecret
    );
    const { data: preparedOrder, error: updateError } = await supabase
      .from("store_orders")
      .update({
        payment_provider: "wompi",
        payment_reference: order.order_reference,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("payment_status", "pending")
      .or("payment_provider.is.null,payment_provider.eq.wompi")
      .select("id")
      .maybeSingle();

    if (updateError) {
      logSupabaseFailure("prepare_payment", updateError, order.id);
      return NextResponse.json({ error: "No se pudo preparar el pago Wompi." }, { status: 500 });
    }
    if (!preparedOrder) {
      return NextResponse.json({ error: "El pedido cambió antes de iniciar el pago." }, { status: 409 });
    }

    console.info("Wompi Sandbox checkout prepared", {
      orderReference: order.order_reference,
      amountInCents: amountInCents.toString(),
    });

    return NextResponse.json({
      checkout_url: wompiSandboxCheckoutUrl(),
      fields: {
        "public-key": config.publicKey,
        currency: order.currency,
        "amount-in-cents": amountInCents.toString(),
        reference: order.order_reference,
        "signature:integrity": integritySignature,
        "redirect-url": `${config.appUrl}/store/payment/return`,
      },
    });
  } catch (error) {
    console.error(
      `Wompi Sandbox checkout could not be prepared ${JSON.stringify({
        message: error instanceof Error ? error.message : "unknown_error",
      })}`
    );
    return NextResponse.json({ error: "No se pudo iniciar el pago en este momento." }, { status: 500 });
  }
}

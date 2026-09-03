import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWompiSandboxConfig, sha256 } from "@/lib/wompi/sandbox";

export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;
type WompiWebhook = {
  event?: unknown;
  environment?: unknown;
  data?: unknown;
  signature?: unknown;
  timestamp?: unknown;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pathValue(data: JsonRecord, path: string): string | null {
  if (!/^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*$/.test(path)) return null;

  let current: unknown = data;
  for (const segment of path.split(".")) {
    if (!isRecord(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return null;
    }
    current = current[segment];
  }

  if (typeof current === "string" || typeof current === "number" || typeof current === "boolean") {
    return String(current);
  }
  return null;
}

function validChecksum(candidate: string, expected: string) {
  const normalizedCandidate = candidate.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalizedCandidate)) return false;
  return timingSafeEqual(Buffer.from(normalizedCandidate), Buffer.from(expected));
}

function asAmountInCents(value: unknown): string | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return String(value);
  }
  if (typeof value === "string" && /^\d+$/.test(value)) return value;
  return null;
}

function responseReceived() {
  return NextResponse.json({ received: true }, { status: 200 });
}

function logWebhookProcessingFailure(
  reference: string,
  transactionId: string,
  wompiStatus: string,
  outcome: string
) {
  console.error(
    `Wompi webhook could not apply transaction ${JSON.stringify({
      orderReference: reference,
      transactionId,
      wompiStatus,
      outcome,
    })}`
  );
}

export async function POST(request: Request) {
  let payload: WompiWebhook;

  try {
    const rawBody = await request.text();
    payload = JSON.parse(rawBody) as WompiWebhook;
  } catch {
    console.warn("Wompi webhook rejected malformed body");
    return NextResponse.json({ error: "Invalid webhook body." }, { status: 400 });
  }

  const signature = isRecord(payload.signature) ? payload.signature : null;
  const data = isRecord(payload.data) ? payload.data : null;
  const properties = signature?.properties;
  const bodyChecksum = signature?.checksum;
  const headerChecksum = request.headers.get("x-event-checksum");

  if (
    !data ||
    !Array.isArray(properties) ||
    properties.length === 0 ||
    !properties.every((property) => typeof property === "string") ||
    (typeof bodyChecksum !== "string" && !headerChecksum) ||
    (typeof payload.timestamp !== "number" && typeof payload.timestamp !== "string")
  ) {
    console.warn("Wompi webhook rejected incomplete signature envelope");
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const timestamp = String(payload.timestamp);
  if (!/^\d+$/.test(timestamp)) {
    console.warn("Wompi webhook rejected invalid timestamp");
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const values = properties.map((property) => pathValue(data, property));
  if (values.some((value) => value === null)) {
    console.warn("Wompi webhook rejected unresolved signature property");
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  try {
    const config = getWompiSandboxConfig();
    const calculatedChecksum = sha256(`${values.join("")}${timestamp}${config.eventsSecret}`);
    const providedChecksum = typeof bodyChecksum === "string" ? bodyChecksum : headerChecksum!;

    if (
      !validChecksum(providedChecksum, calculatedChecksum) ||
      (headerChecksum !== null && !validChecksum(headerChecksum, calculatedChecksum))
    ) {
      console.warn("Wompi webhook rejected invalid checksum", {
        event: typeof payload.event === "string" ? payload.event : "unknown",
      });
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }

    if (payload.environment !== "test") {
      console.warn("Wompi webhook ignored non-sandbox environment", {
        event: typeof payload.event === "string" ? payload.event : "unknown",
      });
      return responseReceived();
    }
    if (payload.event !== "transaction.updated") return responseReceived();

    const transaction = isRecord(data.transaction) ? data.transaction : null;
    const reference = transaction?.reference;
    const transactionId = transaction?.id;
    const currency = transaction?.currency;
    const amountInCents = asAmountInCents(transaction?.amount_in_cents);
    const status = transaction?.status;

    if (
      !transaction ||
      typeof reference !== "string" ||
      !reference ||
      typeof transactionId !== "string" ||
      !transactionId ||
      typeof currency !== "string" ||
      !currency ||
      !amountInCents ||
      typeof status !== "string"
    ) {
      console.error(
        `Wompi webhook could not process incomplete transaction ${JSON.stringify({
          event: payload.event,
        })}`
      );
      return NextResponse.json({ error: "Incomplete transaction event." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: result, error } = await supabase
      .rpc("apply_wompi_transaction_update", {
        p_payment_reference: reference,
        p_provider_transaction_id: transactionId,
        p_amount_in_cents: amountInCents,
        p_currency: currency,
        p_wompi_status: status,
      })
      .maybeSingle();

    if (error) throw new Error(error.message);

    const webhookResult = result as { outcome?: string } | null;
    const outcome = webhookResult?.outcome ?? "unknown";
    if (
      outcome === "paid" ||
      outcome === "failed" ||
      outcome === "idempotent_paid" ||
      outcome === "idempotent_failed" ||
      outcome === "ignored_status"
    ) {
      console.info(
        `Wompi webhook processed ${JSON.stringify({
          orderReference: reference,
          transactionId,
          wompiStatus: status,
          outcome,
        })}`
      );
      return responseReceived();
    }

    logWebhookProcessingFailure(reference, transactionId, status, outcome);
    return NextResponse.json({ error: "Webhook transaction was not applied." }, { status: 500 });
  } catch (error) {
    console.error(
      `Wompi webhook processing failed ${JSON.stringify({
        message: error instanceof Error ? error.message : "unknown_error",
      })}`
    );
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}

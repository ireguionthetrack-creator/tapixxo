import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTexasWaiterPanelAccess } from "@/lib/waiter-panel/texas-access";

export const runtime = "nodejs";

type SubscriptionBody = {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
};

function validSubscription(body: SubscriptionBody) {
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth = typeof body.keys?.auth === "string" ? body.keys.auth : "";
  try {
    if (new URL(endpoint).protocol !== "https:") return null;
  } catch {
    return null;
  }
  if (!p256dh || !auth) return null;
  return { endpoint, p256dh, auth };
}

export async function POST(request: Request) {
  const access = await getTexasWaiterPanelAccess();
  if (!access) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    const subscription = validSubscription(await request.json() as SubscriptionBody);
    if (!subscription) return NextResponse.json({ error: "La suscripción no es válida." }, { status: 400 });

    const { error } = await createAdminClient().from("waiter_push_subscriptions").upsert({
      company_id: access.companyId,
      ...subscription,
      enabled: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "endpoint" });
    if (error) return NextResponse.json({ error: "No se pudo activar este dispositivo." }, { status: 503 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo activar este dispositivo." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const access = await getTexasWaiterPanelAccess();
  if (!access) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    const subscription = validSubscription(await request.json() as SubscriptionBody);
    if (!subscription) return NextResponse.json({ error: "La suscripción no es válida." }, { status: 400 });
    const { error } = await createAdminClient()
      .from("waiter_push_subscriptions")
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq("company_id", access.companyId)
      .eq("endpoint", subscription.endpoint);
    if (error) return NextResponse.json({ error: "No se pudo silenciar este dispositivo." }, { status: 503 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo silenciar este dispositivo." }, { status: 400 });
  }
}

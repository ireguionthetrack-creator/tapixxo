import "server-only";

import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

type TexasWaiterPushPayload = {
  companyId: string;
  requestId: string;
  tableLabel: string;
};

type StoredSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_TEXAS_WAITER_VAPID_PUBLIC_KEY;
  const privateKey = process.env.TEXAS_WAITER_VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(
    process.env.TEXAS_WAITER_VAPID_SUBJECT ?? "mailto:soporte@tapixxo.com",
    publicKey,
    privateKey,
  );
  return true;
}

function statusCodeOf(error: unknown) {
  if (typeof error !== "object" || error === null || !("statusCode" in error)) return null;
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return typeof statusCode === "number" ? statusCode : null;
}

export async function sendTexasWaiterPush({ companyId, requestId, tableLabel }: TexasWaiterPushPayload) {
  if (!configureWebPush()) return;

  const admin = createAdminClient();
  const { data: subscriptions } = await admin
    .from("waiter_push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("company_id", companyId)
    .eq("enabled", true);

  const payload = JSON.stringify({
    title: "Texas Resto Bar · Llamado de mesa",
    body: `${tableLabel} solicita atención`,
    requestId,
    url: "/waiter",
  });

  await Promise.allSettled((subscriptions as StoredSubscription[] | null ?? []).map(async (subscription) => {
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        payload,
        { TTL: 60, urgency: "high" },
      );
    } catch (error) {
      if ([404, 410].includes(statusCodeOf(error) ?? 0)) {
        await admin.from("waiter_push_subscriptions").update({ enabled: false }).eq("id", subscription.id);
      }
    }
  }));
}

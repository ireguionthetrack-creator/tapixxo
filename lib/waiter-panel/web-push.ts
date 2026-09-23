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

export type TexasWaiterPushResult = {
  configured: boolean;
  subscriptions: number;
  delivered: number;
  failed: number;
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
  if (!configureWebPush()) {
    console.error("Texas waiter push is not configured.");
    return { configured: false, subscriptions: 0, delivered: 0, failed: 0 } satisfies TexasWaiterPushResult;
  }

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

  let delivered = 0;
  let failed = 0;
  const storedSubscriptions = subscriptions as StoredSubscription[] | null ?? [];
  await Promise.allSettled(storedSubscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        payload,
        { TTL: 60, urgency: "high" },
      );
      delivered += 1;
    } catch (error) {
      failed += 1;
      console.error("Texas waiter push delivery failed", {
        subscriptionId: subscription.id,
        statusCode: statusCodeOf(error),
        message: error instanceof Error ? error.message : "Unknown push error",
      });
      if ([404, 410].includes(statusCodeOf(error) ?? 0)) {
        await admin.from("waiter_push_subscriptions").update({ enabled: false }).eq("id", subscription.id);
      }
    }
  }));

  return { configured: true, subscriptions: storedSubscriptions.length, delivered, failed } satisfies TexasWaiterPushResult;
}

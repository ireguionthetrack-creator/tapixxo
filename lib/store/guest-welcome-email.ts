import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

type BeginWelcomeEmailResult = {
  outcome?: string;
  order_id?: string;
  recipient_email?: string;
  recipient_first_name?: string | null;
  onboarding_auth_user_id?: string;
};

type RpcOutcome = { outcome?: string };

export type GuestWelcomeEmailOutcome =
  | "welcome_email_sent"
  | "welcome_email_already_sent"
  | "welcome_email_not_eligible"
  | "welcome_email_in_progress"
  | "welcome_email_failed";

function appUrl() {
  const configuredUrl = process.env.TAPIXXO_APP_URL;
  if (!configuredUrl) throw new Error("welcome_email_app_url_not_configured");

  const parsedUrl = new URL(configuredUrl);
  if (parsedUrl.origin !== "https://www.tapixxo.com") {
    throw new Error("welcome_email_app_url_invalid");
  }

  return parsedUrl.origin;
}

function emailConfiguration() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.TAPIXXO_EMAIL_FROM;

  if (!apiKey || !from) return null;
  return { apiKey, from };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

function safeRecipientName(firstName: string | null | undefined) {
  return firstName?.trim() || "";
}

async function markFailed(orderId: string, reason: string) {
  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin
    .rpc("mark_guest_welcome_email_failed", {
      p_order_id: orderId,
      p_reason: reason,
    })
    .maybeSingle();

  if (error || !data) throw new Error("welcome_email_failure_not_recorded");
  return data as RpcOutcome;
}

async function markSent(orderId: string, providerId: string) {
  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin
    .rpc("mark_guest_welcome_email_sent", {
      p_order_id: orderId,
      p_provider_id: providerId,
    })
    .maybeSingle();

  if (error || !data) throw new Error("welcome_email_success_not_recorded");
  return data as RpcOutcome;
}

/**
 * Se invoca solo desde el webhook de Wompi ya validado. La referencia no llega
 * de un formulario ni de una ruta pública de envío de accesos.
 */
export async function sendGuestWelcomeEmailFromWompiReference(
  paymentReference: string
): Promise<GuestWelcomeEmailOutcome> {
  const supabaseAdmin = createAdminClient();
  const { data: order, error: orderError } = await supabaseAdmin
    .from("store_orders")
    .select("id")
    .eq("payment_provider", "wompi")
    .eq("payment_reference", paymentReference)
    .maybeSingle();

  if (orderError || !order) throw new Error("welcome_email_order_not_resolved");

  const { data: beginData, error: beginError } = await supabaseAdmin
    .rpc("begin_guest_welcome_email", { p_order_id: order.id })
    .maybeSingle();

  if (beginError || !beginData) throw new Error("welcome_email_could_not_begin");
  const begin = beginData as BeginWelcomeEmailResult;

  if (begin.outcome === "already_sent") return "welcome_email_already_sent";
  if (begin.outcome === "not_eligible") return "welcome_email_not_eligible";
  if (begin.outcome === "in_progress") return "welcome_email_in_progress";
  if (begin.outcome !== "ready" || !begin.order_id || !begin.recipient_email || !begin.onboarding_auth_user_id) {
    return "welcome_email_failed";
  }

  const configuration = emailConfiguration();
  if (!configuration) {
    await markFailed(begin.order_id, "welcome_email_provider_not_configured");
    return "welcome_email_failed";
  }

  let redirectTo: string;
  try {
    redirectTo = `${appUrl()}/auth/set-password`;
  } catch {
    await markFailed(begin.order_id, "welcome_email_app_url_invalid");
    return "welcome_email_failed";
  }

  const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(
    begin.onboarding_auth_user_id
  );
  const authUser = authUserData.user;

  if (
    authUserError ||
    !authUser ||
    authUser.email?.trim().toLowerCase() !== begin.recipient_email
  ) {
    await markFailed(begin.order_id, "welcome_email_auth_identity_mismatch");
    return "welcome_email_failed";
  }

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: begin.recipient_email,
    options: { redirectTo },
  });

  const actionLink = linkData?.properties?.action_link;
  if (linkError || !actionLink || linkData.user.id !== begin.onboarding_auth_user_id) {
    await markFailed(begin.order_id, "welcome_email_auth_link_generation_failed");
    return "welcome_email_failed";
  }

  const recipientName = safeRecipientName(begin.recipient_first_name);
  const greeting = recipientName ? `Hola ${escapeHtml(recipientName)},` : "Hola,";
  const resend = new Resend(configuration.apiKey);
  const { data: emailData, error: emailError } = await resend.emails.send({
    from: configuration.from,
    to: begin.recipient_email,
    subject: "Bienvenido a Tapixxo",
    html: `<!doctype html><html lang="es"><body style="margin:0;background:#111827;color:#f9fafb;font-family:Arial,sans-serif"><main style="max-width:560px;margin:0 auto;padding:40px 24px"><h1 style="margin:0 0 24px;color:#fb923c;font-size:28px">Bienvenido a Tapixxo</h1><p style="line-height:1.6">${greeting}</p><p style="line-height:1.6">Tu compra fue confirmada y tu cuenta de Tapixxo ya está lista.</p><p style="line-height:1.6">Usa el siguiente botón para crear tu contraseña y acceder a tu panel.</p><p style="margin:32px 0"><a href="${actionLink}" style="display:inline-block;border-radius:10px;background:#fb923c;padding:14px 22px;color:#111827;font-weight:700;text-decoration:none">Crear mi contraseña</a></p><p style="line-height:1.6">Después podrás configurar el destino de tus placas desde Tapixxo.</p></main></body></html>`,
    text: `${recipientName ? `Hola ${recipientName},\n\n` : "Hola,\n\n"}Tu compra fue confirmada y tu cuenta de Tapixxo ya está lista. Abre este correo en un cliente compatible con HTML para crear tu contraseña y acceder a tu panel.`,
  });

  if (emailError || !emailData?.id) {
    await markFailed(begin.order_id, "welcome_email_provider_delivery_failed");
    return "welcome_email_failed";
  }

  const sent = await markSent(begin.order_id, emailData.id);
  if (sent.outcome !== "sent" && sent.outcome !== "already_sent") {
    throw new Error("welcome_email_success_state_unresolved");
  }

  return "welcome_email_sent";
}

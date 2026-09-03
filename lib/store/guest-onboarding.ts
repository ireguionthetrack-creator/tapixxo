import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

const ONBOARDING_ORDER_METADATA_KEY = "tapixxo_onboarding_order_id";
const USER_PAGE_SIZE = 1000;

type BeginOnboardingResult = {
  outcome?: string;
  order_id?: string;
  normalized_email?: string;
  onboarding_auth_user_id?: string | null;
};

type RpcOutcome = {
  outcome?: string;
  onboarding_status?: string;
};

type GuestOnboardingOutcome =
  | "guest_onboarding_completed"
  | "guest_onboarding_idempotent"
  | "guest_onboarding_needs_review"
  | "guest_onboarding_not_ready";

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function hasOrderMarker(user: User, orderId: string) {
  const metadata = user.app_metadata;
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    metadata[ONBOARDING_ORDER_METADATA_KEY] === orderId
  );
}

async function findAuthUserByEmail(email: string) {
  const supabaseAdmin = createAdminClient();

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: USER_PAGE_SIZE,
    });

    if (error) throw new Error("No se pudo consultar la identidad del onboarding.");

    const users = data.users ?? [];
    const match = users.find((user) => normalizeEmail(user.email) === email);
    if (match) return match;
    if (users.length < USER_PAGE_SIZE) return null;
  }
}

async function markNeedsReview(orderId: string, reason: string) {
  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin
    .rpc("mark_guest_order_onboarding_needs_review", {
      p_order_id: orderId,
      p_reason: reason,
    })
    .maybeSingle();

  if (error || !data) throw new Error("No se pudo registrar la revisión del onboarding.");
  return data as RpcOutcome;
}

async function resolveOwnedAuthUser(
  orderId: string,
  normalizedEmail: string,
  recordedAuthUserId: string | null
) {
  const supabaseAdmin = createAdminClient();

  if (recordedAuthUserId) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(recordedAuthUserId);
    const user = data.user;

    if (error || !user) throw new Error("No se pudo recuperar la identidad del onboarding.");
    if (normalizeEmail(user.email) !== normalizedEmail || !hasOrderMarker(user, orderId)) {
      await markNeedsReview(orderId, "onboarding_auth_user_identity_mismatch");
      return null;
    }
    return user;
  }

  const existingUser = await findAuthUserByEmail(normalizedEmail);
  if (existingUser) {
    if (hasOrderMarker(existingUser, orderId)) return existingUser;

    await markNeedsReview(orderId, "onboarding_email_already_registered");
    return null;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    email_confirm: false,
    app_metadata: {
      [ONBOARDING_ORDER_METADATA_KEY]: orderId,
    },
  });

  if (!error && data.user) return data.user;

  // Una carrera de email único puede ocurrir tras la comprobación anterior.
  // Solo reutilizamos el usuario si Auth demuestra que pertenece a este pedido.
  const concurrentUser = await findAuthUserByEmail(normalizedEmail);
  if (concurrentUser) {
    if (hasOrderMarker(concurrentUser, orderId)) return concurrentUser;

    await markNeedsReview(orderId, "onboarding_email_already_registered");
    return null;
  }

  throw new Error("No se pudo crear la identidad del onboarding.");
}

/**
 * Solo se invoca desde el webhook firmado de Wompi. La referencia llega de la
 * transacción validada, no de una petición de navegador.
 */
export async function onboardPaidGuestOrderFromWompiReference(
  paymentReference: string
): Promise<GuestOnboardingOutcome> {
  const supabaseAdmin = createAdminClient();
  const { data: order, error: orderError } = await supabaseAdmin
    .from("store_orders")
    .select("id")
    .eq("payment_provider", "wompi")
    .eq("payment_reference", paymentReference)
    .maybeSingle();

  if (orderError || !order) throw new Error("No se pudo resolver el pedido del onboarding.");

  const { data: beginData, error: beginError } = await supabaseAdmin
    .rpc("begin_guest_order_onboarding", { p_order_id: order.id })
    .maybeSingle();

  if (beginError || !beginData) throw new Error("No se pudo iniciar el onboarding.");
  const begin = beginData as BeginOnboardingResult;

  if (begin.outcome === "idempotent_completed") return "guest_onboarding_idempotent";
  if (begin.outcome === "needs_review") return "guest_onboarding_needs_review";
  if (begin.outcome !== "ready" || !begin.order_id || !begin.normalized_email) {
    return "guest_onboarding_not_ready";
  }

  const authUser = await resolveOwnedAuthUser(
    begin.order_id,
    begin.normalized_email,
    begin.onboarding_auth_user_id ?? null
  );
  if (!authUser) return "guest_onboarding_needs_review";

  const { data: recordData, error: recordError } = await supabaseAdmin
    .rpc("record_guest_order_onboarding_auth_user", {
      p_order_id: begin.order_id,
      p_auth_user_id: authUser.id,
    })
    .maybeSingle();

  if (recordError || !recordData) throw new Error("No se pudo registrar la identidad del onboarding.");
  if ((recordData as RpcOutcome).outcome === "needs_review") {
    return "guest_onboarding_needs_review";
  }

  const { data: completeData, error: completeError } = await supabaseAdmin
    .rpc("complete_guest_order_onboarding", {
      p_order_id: begin.order_id,
      p_auth_user_id: authUser.id,
    })
    .maybeSingle();

  if (completeError || !completeData) {
    // No se marca needs_review aquí: puede ser un fallo transitorio tras crear
    // Auth. El marcador app_metadata permite que un reintento retome el mismo
    // usuario sin crear un duplicado.
    throw new Error("No se pudo completar el onboarding.");
  }

  const complete = completeData as RpcOutcome;
  if (complete.outcome === "completed") return "guest_onboarding_completed";
  if (complete.outcome === "idempotent_completed") return "guest_onboarding_idempotent";
  if (complete.outcome === "needs_review") return "guest_onboarding_needs_review";

  return "guest_onboarding_not_ready";
}

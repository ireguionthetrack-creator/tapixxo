import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

const ONBOARDING_ORDER_METADATA_KEY = "tapixxo_onboarding_order_id";
const USER_PAGE_SIZE = 1000;

type ClaimResult = {
  outcome?: string;
  order_id?: string | null;
  email?: string | null;
  business_name?: string | null;
  onboarding_status?: string | null;
};

type OnboardingResult = {
  outcome?: string;
  order_id?: string | null;
  normalized_email?: string | null;
  onboarding_auth_user_id?: string | null;
  onboarding_status?: string | null;
};

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function hasOrderMarker(user: User, orderId: string) {
  return user.app_metadata?.[ONBOARDING_ORDER_METADATA_KEY] === orderId;
}

async function findAuthUserByEmail(email: string) {
  const admin = createAdminClient();
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: USER_PAGE_SIZE });
    if (error) throw new Error("No se pudo consultar la identidad de la cuenta.");

    const users = data.users ?? [];
    const match = users.find((user) => normalizeEmail(user.email) === email);
    if (match) return match;
    if (users.length < USER_PAGE_SIZE) return null;
  }
}

async function resolveOwnedAuthUser(orderId: string, email: string, password: string) {
  const admin = createAdminClient();
  const existing = await findAuthUserByEmail(email);

  if (existing) {
    if (hasOrderMarker(existing, orderId)) return { kind: "owned" as const, user: existing };
    return { kind: "email_exists" as const };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { [ONBOARDING_ORDER_METADATA_KEY]: orderId },
  });

  if (!error && data.user) return { kind: "owned" as const, user: data.user };

  // Una carrera de email único solo puede reutilizar un usuario marcado por
  // este mismo pedido; cualquier otra identidad exige iniciar sesión.
  const concurrent = await findAuthUserByEmail(email);
  if (concurrent) {
    if (hasOrderMarker(concurrent, orderId)) return { kind: "owned" as const, user: concurrent };
    return { kind: "email_exists" as const };
  }

  throw new Error("No se pudo crear la cuenta.");
}

export async function createGuestAccountFromClaim({
  reference,
  claimTokenHash,
  companyName,
  password,
}: {
  reference: string;
  claimTokenHash: string;
  companyName: string;
  password: string;
}) {
  const admin = createAdminClient();
  const { data: claimData, error: claimError } = await admin
    .rpc("resolve_guest_store_order_claim", {
      p_order_reference: reference,
      p_authenticated_user_id: null,
      p_claim_token_hash: claimTokenHash,
      p_provider_transaction_id: null,
    })
    .maybeSingle();

  if (claimError || !claimData) throw new Error("No se pudo validar el pedido.");
  const claim = claimData as ClaimResult;
  if (claim.outcome === "already_claimed") return { outcome: "completed" as const, email: claim.email ?? "" };
  if (claim.outcome !== "guest_ready" || !claim.order_id || !claim.email) {
    return { outcome: "not_authorized" as const };
  }

  const { data: businessNameUpdated, error: businessNameError } = await admin.rpc(
    "update_guest_store_order_claim_business_name",
    {
      p_order_reference: reference,
      p_claim_token_hash: claimTokenHash,
      p_business_name: companyName,
    },
  );
  if (businessNameError || businessNameUpdated !== true) {
    console.error("Guest account business name update failed", {
      code: businessNameError?.code,
      message: businessNameError?.message,
      orderReference: reference,
    });
    throw new Error("No se pudo preparar la cuenta.");
  }

  const email = normalizeEmail(claim.email);
  const authUser = await resolveOwnedAuthUser(claim.order_id, email, password);
  if (authUser.kind === "email_exists") return { outcome: "email_exists" as const };

  const { data: beginData, error: beginError } = await admin
    .rpc("begin_guest_order_onboarding", { p_order_id: claim.order_id })
    .maybeSingle();
  if (beginError || !beginData) throw new Error("No se pudo preparar la cuenta.");

  const begin = beginData as OnboardingResult;
  if (begin.outcome === "idempotent_completed") {
    return { outcome: "completed" as const, email };
  }
  if (begin.outcome !== "ready" || !begin.order_id || !begin.normalized_email) {
    throw new Error("El pedido no está listo para crear una cuenta.");
  }

  if (normalizeEmail(begin.normalized_email) !== email) {
    throw new Error("La identidad del pedido no coincide.");
  }

  const { data: recordData, error: recordError } = await admin
    .rpc("record_guest_order_onboarding_auth_user", {
      p_order_id: begin.order_id,
      p_auth_user_id: authUser.user.id,
    })
    .maybeSingle();
  if (recordError || !recordData || (recordData as OnboardingResult).outcome === "needs_review") {
    throw new Error("No se pudo vincular la cuenta al pedido.");
  }

  const { data: completeData, error: completeError } = await admin
    .rpc("complete_guest_order_onboarding", {
      p_order_id: begin.order_id,
      p_auth_user_id: authUser.user.id,
    })
    .maybeSingle();
  if (completeError || !completeData) throw new Error("No se pudo completar la asignación del pedido.");

  const complete = completeData as OnboardingResult;
  if (complete.outcome !== "completed" && complete.outcome !== "idempotent_completed") {
    throw new Error("La asignación del pedido necesita revisión.");
  }

  const { error: consumeError } = await admin.rpc("consume_guest_store_order_claim", {
    p_order_reference: reference,
    p_claim_token_hash: claimTokenHash,
  });
  if (consumeError) throw new Error("No se pudo cerrar el claim del pedido.");

  return { outcome: "completed" as const, email };
}

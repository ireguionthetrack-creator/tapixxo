import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOrderCreationRateLimited } from "@/lib/store/order-rate-limit";
import {
  GUEST_CLAIM_COOKIE,
  createGuestClaimToken,
  guestClaimCookieOptions,
  hashGuestClaimToken,
} from "@/lib/store/guest-claim";
import { tapixxoNfcProduct } from "@/lib/store/catalog";
import {
  isShippingClassification,
  shippingRatesCop,
} from "@/lib/store/shipping";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TERMS_VERSION = "2026-09-03";

type CheckoutBody = {
  client_request_id?: unknown;
  product_key?: unknown;
  model_key?: unknown;
  quantity?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  business_name?: unknown;
  email?: unknown;
  phone?: unknown;
  country?: unknown;
  department_state?: unknown;
  city?: unknown;
  address?: unknown;
  address_extra?: unknown;
  shipping_classification?: unknown;
  terms_accepted?: unknown;
};

class CheckoutValidationError extends Error {}

function requiredText(value: unknown, label: string, maxLength = 200) {
  if (typeof value !== "string") throw new CheckoutValidationError(`Introduce ${label}.`);
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > maxLength) {
    throw new CheckoutValidationError(`Introduce ${label}.`);
  }
  return cleaned;
}

function optionalText(value: unknown, maxLength = 300) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new CheckoutValidationError("La información adicional no es válida.");
  }
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

async function getAvailableStoreUnitsCount() {
  const supabaseAdmin = createAdminClient();
  const { data: units, error: unitsError } = await supabaseAdmin
    .from("inventory_units")
    .select("code_id")
    .eq("status", "available");

  if (unitsError) throw new Error("No se pudo consultar la disponibilidad.");

  const codeIds = (units ?? []).map((unit) => unit.code_id);
  if (codeIds.length === 0) return 0;

  const { count, error: codesError } = await supabaseAdmin
    .from("codes")
    .select("id", { count: "exact", head: true })
    .in("id", codeIds)
    .is("company_id", null)
    .is("group_id", null);

  if (codesError) throw new Error("No se pudo consultar la disponibilidad.");
  return count ?? 0;
}

async function isRegisteredEmail(email: string) {
  const supabaseAdmin = createAdminClient();
  const pageSize = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: pageSize,
    });

    if (error) throw new Error("No se pudo validar la identidad del comprador.");

    const users = data.users ?? [];
    if (users.some((user) => user.email?.toLowerCase() === email)) return true;
    if (users.length < pageSize) return false;
  }
}

function loginUrl(productKey: string, modelKey: string, quantity: number) {
  const checkoutQuery = new URLSearchParams({
    product_key: productKey,
    model_key: modelKey,
    quantity: String(quantity),
  });
  return `/login?next=${encodeURIComponent(`/store/checkout?${checkoutQuery}`)}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutBody;
    const clientRequestId = requiredText(body.client_request_id, "la solicitud", 36);
    const productKey = requiredText(body.product_key, "el producto", 100);
    const modelKey = requiredText(body.model_key, "el modelo", 100);
    const quantity = body.quantity;

    if (body.terms_accepted !== true) {
      return NextResponse.json(
        { error: "Debes aceptar los Términos y Condiciones para continuar." },
        { status: 400 }
      );
    }

    if (!UUID_PATTERN.test(clientRequestId)) {
      return NextResponse.json({ error: "La solicitud de compra no es válida." }, { status: 400 });
    }
    if (!Number.isInteger(quantity) || typeof quantity !== "number" || quantity < 1) {
      return NextResponse.json({ error: "Selecciona una cantidad válida." }, { status: 400 });
    }
    if (productKey !== tapixxoNfcProduct.slug) {
      return NextResponse.json({ error: "El producto seleccionado no es válido." }, { status: 400 });
    }

    const model = tapixxoNfcProduct.models.find((item) => item.id === modelKey);
    if (!model) {
      return NextResponse.json({ error: "El modelo seleccionado no es válido." }, { status: 400 });
    }
    if (tapixxoNfcProduct.basePriceCop === null) {
      return NextResponse.json(
        { error: "Este producto todavía no está disponible para compra." },
        { status: 409 }
      );
    }
    if (!isShippingClassification(body.shipping_classification)) {
      return NextResponse.json({ error: "Selecciona una opción de envío válida." }, { status: 400 });
    }

    const shippingCop = shippingRatesCop[body.shipping_classification];
    if (shippingCop === null) {
      const message =
        body.shipping_classification === "international"
          ? "El envío internacional no está disponible por ahora."
          : "El envío nacional estará disponible próximamente.";
      return NextResponse.json(
        { error: message },
        { status: 409 }
      );
    }

    const firstName = requiredText(body.first_name, "tu nombre");
    const lastName = requiredText(body.last_name, "tu apellido");
    const businessName = optionalText(body.business_name);
    const requestedEmail = requiredText(body.email, "un email", 254).toLowerCase();
    const phone = requiredText(body.phone, "un teléfono", 50);
    const country = requiredText(body.country, "el país");
    const departmentState = requiredText(body.department_state, "el departamento o estado");
    const city = requiredText(body.city, "la ciudad");
    const address = requiredText(body.address, "la dirección", 500);
    const addressExtra = optionalText(body.address_extra, 500);

    if (!EMAIL_PATTERN.test(requestedEmail)) {
      return NextResponse.json({ error: "Introduce un email válido." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Esta ruta no necesita actualizar cookies para crear el pedido.
            }
          },
        },
      }
    );
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    let userId: string | null = null;
    let companyId: string | null = null;
    let orderEmail = requestedEmail;

    if (user) {
      userId = user.id;
      if (!user.email) {
        return NextResponse.json(
          { error: "Tu cuenta Tapixxo no tiene un email válido." },
          { status: 409 }
        );
      }
      orderEmail = user.email.toLowerCase();

      const supabaseAdmin = createAdminClient();
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("company_id, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw new Error("No se pudo resolver la cuenta Tapixxo.");
      if (profile?.role !== "company" || !profile.company_id) {
        return NextResponse.json(
          {
            error:
              "Tu sesión no está vinculada a una empresa. Usa una cuenta de empresa para comprar y asignar placas.",
          },
          { status: 409 }
        );
      }
      companyId = profile.company_id;
    } else {
      const requestHeaders = await headers();
      const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
      const rateLimitKey = `${forwardedFor ?? "unknown"}:${requestedEmail}`;

      if (isOrderCreationRateLimited(rateLimitKey)) {
        return NextResponse.json(
          { error: "Intenta nuevamente en unos minutos." },
          { status: 429 }
        );
      }

      if (await isRegisteredEmail(requestedEmail)) {
        return NextResponse.json(
          {
            error: "Ya tienes una cuenta en Tapixxo. Inicia sesión para continuar con tu compra.",
            login_url: loginUrl(productKey, modelKey, quantity),
          },
          { status: 409 }
        );
      }
    }

    const available = await getAvailableStoreUnitsCount();
    if (quantity > available) {
      return NextResponse.json(
        { error: `Solo hay ${available} placa${available === 1 ? "" : "s"} disponible${available === 1 ? "" : "s"}.`, available },
        { status: 409 }
      );
    }

    const unitPriceCop = tapixxoNfcProduct.basePriceCop;
    const subtotalCop = unitPriceCop * quantity;
    const totalCop = subtotalCop + shippingCop;
    const guestClaimToken = userId ? null : createGuestClaimToken();
    const guestClaimTokenHash = guestClaimToken ? hashGuestClaimToken(guestClaimToken) : null;
    if (guestClaimToken && !guestClaimTokenHash) {
      throw new Error("No se pudo proteger el claim del pedido.");
    }
    const supabaseAdmin = createAdminClient();
    const { data: order, error: orderError } = await supabaseAdmin
      .rpc("create_pending_store_order", {
        p_client_request_id: clientRequestId,
        p_user_id: userId,
        p_company_id: companyId,
        p_first_name: firstName,
        p_last_name: lastName,
        p_business_name: businessName,
        p_email: orderEmail,
        p_phone: phone,
        p_country: country,
        p_department_state: departmentState,
        p_city: city,
        p_address: address,
        p_address_extra: addressExtra,
        p_shipping_classification: body.shipping_classification,
        p_subtotal_cop: subtotalCop,
        p_shipping_cop: shippingCop,
        p_total_cop: totalCop,
        p_product_key: tapixxoNfcProduct.slug,
        p_product_name: tapixxoNfcProduct.name,
        p_model_key: model.id,
        p_model_name: model.name,
        p_quantity: quantity,
        p_unit_price_cop: unitPriceCop,
        p_line_total_cop: subtotalCop,
        p_terms_accepted: true,
        p_terms_version: TERMS_VERSION,
        p_guest_claim_token_hash: guestClaimTokenHash,
      })
      .single();

    if (orderError || !order) {
      throw new Error(orderError?.message ?? "No se pudo preparar el pedido.");
    }

    const response = NextResponse.json({ order }, { status: 201 });
    if (guestClaimToken) response.cookies.set(GUEST_CLAIM_COOKIE, guestClaimToken, guestClaimCookieOptions());
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo preparar el pedido.";
    return NextResponse.json(
      { error: message },
      { status: error instanceof CheckoutValidationError ? 400 : 500 }
    );
  }
}

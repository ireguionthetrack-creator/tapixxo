import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createGuestAccountFromClaim } from "@/lib/store/guest-account-claim";
import {
  GUEST_CLAIM_COOKIE,
  guestClaimCookieOptions,
  hashGuestClaimToken,
} from "@/lib/store/guest-claim";

export const dynamic = "force-dynamic";

const REFERENCE_PATTERN = /^TPX-\d{6}$/;
const MIN_PASSWORD_LENGTH = 8;

type AccountBody = {
  reference?: unknown;
  company_name?: unknown;
  password?: unknown;
  password_confirmation?: unknown;
};

function requiredText(value: unknown, label: string, maxLength: number) {
  if (typeof value !== "string") throw new Error(`Introduce ${label}.`);
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > maxLength) throw new Error(`Introduce ${label}.`);
  return cleaned;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AccountBody;
    if (typeof body.reference !== "string" || !REFERENCE_PATTERN.test(body.reference)) {
      return NextResponse.json({ error: "Pedido no válido." }, { status: 400 });
    }

    const companyName = requiredText(body.company_name, "el nombre de empresa", 160);
    if (typeof body.password !== "string" || body.password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` },
        { status: 400 }
      );
    }
    if (body.password !== body.password_confirmation) {
      return NextResponse.json({ error: "Las contraseñas no coinciden." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(GUEST_CLAIM_COOKIE)?.value;
    const claimTokenHash = token ? hashGuestClaimToken(token) : null;
    if (!claimTokenHash) {
      return NextResponse.json({ error: "La sesión segura del pedido expiró. Vuelve al retorno de pago." }, { status: 403 });
    }

    const result = await createGuestAccountFromClaim({
      reference: body.reference,
      claimTokenHash,
      companyName,
      password: body.password,
    });

    if (result.outcome === "email_exists") {
      return NextResponse.json(
        {
          error: "Ya tienes una cuenta en Tapixxo. Inicia sesión para continuar.",
          login_url: "/login",
        },
        { status: 409 }
      );
    }
    if (result.outcome !== "completed") {
      return NextResponse.json({ error: "No se pudo validar el pedido." }, { status: 403 });
    }

    const response = NextResponse.json({ email: result.email });
    response.cookies.set(GUEST_CLAIM_COOKIE, "", { ...guestClaimCookieOptions(), maxAge: 0 });
    return response;
  } catch (error) {
    // Nunca se registran cuerpos de solicitud: pueden contener una contraseña.
    console.error("Guest account claim failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return NextResponse.json({ error: "No se pudo crear la cuenta en este momento." }, { status: 500 });
  }
}

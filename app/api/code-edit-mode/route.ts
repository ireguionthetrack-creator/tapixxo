import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CODE_EDIT_MODE_COOKIE,
  codeEditModeCookieOptions,
} from "@/lib/code-edit-mode";

async function authorizeCompanyMode(companyId: string) {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll() {} } }
  );
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) return { authorized: false, cookieStore };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .maybeSingle();

  const authorized =
    profile?.role === "admin" ||
    (profile?.role === "company" && profile.company_id === companyId);

  return { authorized, cookieStore };
}

export async function GET(request: Request) {
  const companyId = new URL(request.url).searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "Empresa no válida." }, { status: 400 });
  }

  const { authorized, cookieStore } = await authorizeCompanyMode(companyId);
  if (!authorized) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  return NextResponse.json({
    enabled: cookieStore.get(CODE_EDIT_MODE_COOKIE)?.value === companyId,
  });
}

export async function POST(request: Request) {
  let body: { companyId?: unknown; enabled?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  if (typeof body.companyId !== "string" || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  const { authorized } = await authorizeCompanyMode(body.companyId);
  if (!authorized) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const response = NextResponse.json({ enabled: body.enabled });
  if (body.enabled) {
    response.cookies.set(
      CODE_EDIT_MODE_COOKIE,
      body.companyId,
      codeEditModeCookieOptions()
    );
  } else {
    response.cookies.set(CODE_EDIT_MODE_COOKIE, "", {
      ...codeEditModeCookieOptions(),
      maxAge: 0,
    });
  }

  return response;
}

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Las cookies no se pueden modificar en todos los contextos.
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "No estás autenticado." },
        { status: 401 }
      );
    }

    const { id: companyId } = await params;
    const supabaseAdmin = createAdminClient();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, company_id")
      .eq("id", user.id)
      .single();

    const hasAccess =
      profile?.role === "admin" ||
      (profile?.role === "company" && profile.company_id === companyId);

    if (profileError || !hasAccess) {
      return NextResponse.json(
        { error: "No tienes permisos para ver estos escaneos." },
        { status: 403 }
      );
    }

    const { data: groups, error: groupsError } = await supabaseAdmin
      .from("code_groups")
      .select("id")
      .eq("company_id", companyId);

    if (groupsError) {
      return NextResponse.json(
        { error: groupsError.message },
        { status: 500 }
      );
    }

    const groupIds = (groups ?? []).map((group) => group.id);

    if (groupIds.length === 0) {
      return NextResponse.json({ counts: {} });
    }

    const { data: codes, error: codesError } = await supabaseAdmin
      .from("codes")
      .select("id")
      .in("group_id", groupIds);

    if (codesError) {
      return NextResponse.json(
        { error: codesError.message },
        { status: 500 }
      );
    }

    const codeIds = (codes ?? []).map((code) => code.id);

    if (codeIds.length === 0) {
      return NextResponse.json({ counts: {} });
    }

    const { data: scans, error: scansError } = await supabaseAdmin
      .from("code_scans")
      .select("code_id")
      .in("code_id", codeIds);

    if (scansError) {
      return NextResponse.json(
        { error: scansError.message },
        { status: 500 }
      );
    }

    const counts: Record<string, number> = {};

    for (const scan of scans ?? []) {
      counts[scan.code_id] = (counts[scan.code_id] ?? 0) + 1;
    }

    return NextResponse.json({ counts });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error interno del servidor.",
      },
      { status: 500 }
    );
  }
}

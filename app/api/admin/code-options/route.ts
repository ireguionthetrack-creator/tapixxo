import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
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

    const supabaseAdmin = createAdminClient();

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json(
        { error: "No tienes permisos para gestionar códigos." },
        { status: 403 }
      );
    }

    const [{ data: companies, error: companiesError }, { data: groups, error: groupsError }] =
      await Promise.all([
        supabaseAdmin
          .from("companies")
          .select("id, name")
          .order("name", { ascending: true }),
        supabaseAdmin
          .from("code_groups")
          .select("id, name, company_id")
          .order("name", { ascending: true }),
      ]);

    if (companiesError || groupsError) {
      return NextResponse.json(
        {
          error:
            companiesError?.message ??
            groupsError?.message ??
            "No se pudieron cargar las empresas y grupos.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      companies: companies ?? [],
      groups: groups ?? [],
    });
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

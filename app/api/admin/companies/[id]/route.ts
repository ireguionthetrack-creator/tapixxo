import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  request: Request,
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

    if (authError || !user?.email) {
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
        { error: "No tienes permisos para eliminar empresas." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const password = String(body.password ?? "");

    if (!password) {
      return NextResponse.json(
        { error: "Introduce tu contraseña de administrador." },
        { status: 400 }
      );
    }

    const passwordAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    const { data: verifiedSession, error: passwordError } =
      await passwordAuth.auth.signInWithPassword({
        email: user.email,
        password,
      });

    if (passwordError || verifiedSession.user?.id !== user.id) {
      return NextResponse.json(
        { error: "La contraseña de administrador no es correcta." },
        { status: 401 }
      );
    }

    const { id: companyId } = await params;
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id, name")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError) {
      return NextResponse.json(
        { error: companyError.message },
        { status: 500 }
      );
    }

    if (!company) {
      return NextResponse.json(
        { error: "La empresa no existe." },
        { status: 404 }
      );
    }

    const [{ data: groups, error: groupsError }, { data: companyProfiles, error: profilesError }] =
      await Promise.all([
        supabaseAdmin
          .from("code_groups")
          .select("id")
          .eq("company_id", companyId),
        supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("company_id", companyId),
      ]);

    if (groupsError || profilesError) {
      return NextResponse.json(
        {
          error:
            groupsError?.message ??
            profilesError?.message ??
            "No se pudo preparar la eliminación de la empresa.",
        },
        { status: 500 }
      );
    }

    const groupIds = (groups ?? []).map((group) => group.id);

    if (groupIds.length > 0) {
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

      if (codeIds.length > 0) {
        const { error: scansError } = await supabaseAdmin
          .from("code_scans")
          .delete()
          .in("code_id", codeIds);

        if (scansError) {
          return NextResponse.json(
            { error: scansError.message },
            { status: 500 }
          );
        }

        const { error: codesDeleteError } = await supabaseAdmin
          .from("codes")
          .delete()
          .in("id", codeIds);

        if (codesDeleteError) {
          return NextResponse.json(
            { error: codesDeleteError.message },
            { status: 500 }
          );
        }
      }

      const { error: groupsDeleteError } = await supabaseAdmin
        .from("code_groups")
        .delete()
        .eq("company_id", companyId);

      if (groupsDeleteError) {
        return NextResponse.json(
          { error: groupsDeleteError.message },
          { status: 500 }
        );
      }
    }

    const { error: profilesDeleteError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("company_id", companyId);

    if (profilesDeleteError) {
      return NextResponse.json(
        { error: profilesDeleteError.message },
        { status: 500 }
      );
    }

    const { error: companyDeleteError } = await supabaseAdmin
      .from("companies")
      .delete()
      .eq("id", companyId);

    if (companyDeleteError) {
      return NextResponse.json(
        { error: companyDeleteError.message },
        { status: 500 }
      );
    }

    for (const companyProfile of companyProfiles ?? []) {
      const { error: userDeleteError } =
        await supabaseAdmin.auth.admin.deleteUser(companyProfile.id);

      if (userDeleteError) {
        return NextResponse.json(
          {
            error:
              "La empresa fue eliminada, pero no se pudo eliminar una de sus cuentas de acceso: " +
              userDeleteError.message,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      companyName: company.name,
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

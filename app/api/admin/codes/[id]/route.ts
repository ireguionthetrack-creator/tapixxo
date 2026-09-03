import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAdminClient() {
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
    return { error: "No estás autenticado.", status: 401 };
  }

  const supabaseAdmin = createAdminClient();

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return {
      error: "No tienes permisos para gestionar códigos.",
      status: 403,
    };
  }

  return { supabaseAdmin };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authorization = await getAdminClient();

    if ("error" in authorization) {
      return NextResponse.json(
        { error: authorization.error },
        { status: authorization.status }
      );
    }

    const { id: codeId } = await params;
    const body = await request.json();
    const targetGroupId = String(body.targetGroupId ?? "").trim();

    if (!codeId || !targetGroupId) {
      return NextResponse.json(
        { error: "Debes seleccionar el grupo de destino." },
        { status: 400 }
      );
    }

    const { data: targetGroup, error: targetGroupError } =
      await authorization.supabaseAdmin
        .from("code_groups")
        .select("id, company_id")
        .eq("id", targetGroupId)
        .maybeSingle();

    if (targetGroupError) {
      return NextResponse.json(
        { error: targetGroupError.message },
        { status: 500 }
      );
    }

    if (!targetGroup) {
      return NextResponse.json(
        { error: "El grupo de destino no existe." },
        { status: 404 }
      );
    }

    const { data: code, error: updateError } =
      await authorization.supabaseAdmin
        .from("codes")
        .update({
          company_id: targetGroup.company_id,
          group_id: targetGroup.id,
        })
        .eq("id", codeId)
        .select("id, company_id, group_id")
        .maybeSingle();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: "El código no existe." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, code });
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authorization = await getAdminClient();

    if ("error" in authorization) {
      return NextResponse.json(
        { error: authorization.error },
        { status: authorization.status }
      );
    }

    const { id: codeId } = await params;

    if (!codeId) {
      return NextResponse.json(
        { error: "No se encontró el código." },
        { status: 400 }
      );
    }

    const { data: code, error: deleteError } =
      await authorization.supabaseAdmin
        .from("codes")
        .delete()
        .eq("id", codeId)
        .select("id")
        .maybeSingle();

    if (deleteError) {
      if (deleteError.code === "23503") {
        return NextResponse.json(
          {
            error:
              "No se puede eliminar el código porque tiene escaneos asociados. Aplica la migración de Supabase incluida en el proyecto.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: "El código no existe." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
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

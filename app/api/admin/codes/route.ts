import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

type NewCode = {
  code: string;
  group_id?: string | null;
  destination_url?: string | null;
  active?: boolean;
};

export async function POST(request: Request) {
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
        { error: "No tienes permisos para crear códigos." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const codes = body.codes as NewCode[] | undefined;

    if (!Array.isArray(codes) || codes.length < 1 || codes.length > 1000) {
      return NextResponse.json(
        { error: "Debes enviar entre 1 y 1000 códigos." },
        { status: 400 }
      );
    }

    const isValidCode = codes.every((newCode) => {
      const groupId = newCode.group_id ?? null;

      return (
        typeof newCode.code === "string" &&
        /^[A-Z]+[1-9]\d*$/.test(newCode.code) &&
        (groupId === null ||
          (typeof groupId === "string" && groupId.trim().length > 0)) &&
        (newCode.destination_url === undefined ||
          newCode.destination_url === null ||
          typeof newCode.destination_url === "string") &&
        (newCode.active === undefined || typeof newCode.active === "boolean")
      );
    });

    if (!isValidCode) {
      return NextResponse.json(
        { error: "Los datos de los códigos no son válidos." },
        { status: 400 }
      );
    }

    const globalCodes = codes.filter((newCode) => !newCode.group_id);

    if (
      globalCodes.some(
        (newCode) =>
          newCode.active !== false ||
          (newCode.destination_url !== undefined && newCode.destination_url !== null)
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Los códigos globales deben crearse inactivos y sin destination_url.",
        },
        { status: 400 }
      );
    }

    const groupIds = [
      ...new Set(
        codes
          .map((newCode) => newCode.group_id?.trim() ?? null)
          .filter((groupId): groupId is string => groupId !== null)
      ),
    ];
    const { data: groups, error: groupsError } = await supabaseAdmin
      .from("code_groups")
      .select("id, company_id")
      .in("id", groupIds);

    if (groupsError) {
      return NextResponse.json(
        { error: groupsError.message },
        { status: 500 }
      );
    }

    if ((groups ?? []).length !== groupIds.length) {
      return NextResponse.json(
        { error: "El grupo seleccionado no existe." },
        { status: 400 }
      );
    }

    const groupsById = new Map(
      (groups ?? []).map((group) => [group.id, group])
    );
    const rows = codes.map((newCode) => {
      const groupId = newCode.group_id?.trim() ?? null;

      if (!groupId) {
        return {
          code: newCode.code,
          company_id: null,
          group_id: null,
          destination_url: null,
          active: false,
        };
      }

      const group = groupsById.get(groupId)!;
      return {
        code: newCode.code,
        company_id: group.company_id,
        group_id: group.id,
        destination_url: newCode.destination_url ?? null,
        active: newCode.active ?? true,
      };
    });

    const { error: insertError } = await supabaseAdmin
      .from("codes")
      .insert(rows);

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message, code: insertError.code },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, created: rows.length }, { status: 201 });
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

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    // Cliente para comprobar la sesión del usuario actual
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
              cookiesToSet.forEach(
                ({ name, value, options }) => {
                  cookieStore.set(
                    name,
                    value,
                    options
                  );
                }
              );
            } catch {
              // No hacemos nada si las cookies
              // no pueden modificarse aquí.
            }
          },
        },
      }
    );

    // Obtener usuario actualmente autenticado
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "No estás autenticado.",
        },
        {
          status: 401,
        }
      );
    }

    // Cliente administrativo.
    // Esta clave SOLO existe en el servidor.
    const supabaseAdmin = createAdminClient();

    // Comprobar que el usuario es administrador
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (
      profileError ||
      !profile ||
      profile.role !== "admin"
    ) {
      return NextResponse.json(
        {
          error:
            "No tienes permisos para crear empresas.",
        },
        {
          status: 403,
        }
      );
    }

    // Leer datos enviados por el formulario
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body.password ?? "");

    // Validaciones
    if (!name || !email || !password) {
      return NextResponse.json(
        {
          error:
            "Nombre, email y contraseña son obligatorios.",
        },
        {
          status: 400,
        }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error:
            "La contraseña debe tener al menos 8 caracteres.",
        },
        {
          status: 400,
        }
      );
    }

    // 1. Crear empresa
    const {
      data: company,
      error: companyError,
    } = await supabaseAdmin
      .from("companies")
      .insert({
        name,
      })
      .select("id, name")
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        {
          error:
            companyError?.message ??
            "No se pudo crear la empresa.",
        },
        {
          status: 400,
        }
      );
    }

    // 2. Crear usuario empresarial
    const {
      data: userData,
      error: createUserError,
    } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    // Si falla la creación del usuario,
    // eliminamos la empresa que acabamos de crear.
    if (
      createUserError ||
      !userData.user
    ) {
      await supabaseAdmin
        .from("companies")
        .delete()
        .eq("id", company.id);

      return NextResponse.json(
        {
          error:
            createUserError?.message ??
            "No se pudo crear el usuario.",
        },
        {
          status: 400,
        }
      );
    }

    // 3. Crear perfil y vincular usuario con empresa
    const {
      error: newProfileError,
    } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userData.user.id,
        company_id: company.id,
        role: "company",
      });

    // Si falla el perfil, hacemos limpieza.
    if (newProfileError) {
      await supabaseAdmin.auth.admin.deleteUser(
        userData.user.id
      );

      await supabaseAdmin
        .from("companies")
        .delete()
        .eq("id", company.id);

      return NextResponse.json(
        {
          error: newProfileError.message,
        },
        {
          status: 400,
        }
      );
    }

    // Todo salió correctamente
    return NextResponse.json(
      {
        success: true,
        company: {
          id: company.id,
          name: company.name,
        },
        user: {
          id: userData.user.id,
          email: userData.user.email,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Error creando empresa:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error interno del servidor.",
      },
      {
        status: 500,
      }
    );
  }
}

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "company-avatars";
const MAX_FILE_SIZE = 2 * 1024 * 1024;

async function getAuthorizedCompany(companyId: string) {
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
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  const hasAccess =
    profile?.role === "admin" ||
    (profile?.role === "company" && profile.company_id === companyId);

  if (profileError || !hasAccess) {
    return {
      error: "No tienes permisos para gestionar esta imagen.",
      status: 403,
    };
  }

  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .select("id, profile_image_path")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError) {
    return { error: companyError.message, status: 500 };
  }

  if (!company) {
    return { error: "La empresa no existe.", status: 404 };
  }

  return { supabaseAdmin, company };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const authorization = await getAuthorizedCompany(companyId);

    if ("error" in authorization) {
      return NextResponse.json(
        { error: authorization.error },
        { status: authorization.status }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Selecciona una imagen para subir." },
        { status: 400 }
      );
    }

    if (file.type !== "image/webp") {
      return NextResponse.json(
        { error: "La imagen debe estar optimizada en formato WEBP." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "La imagen no puede superar los 2 MB." },
        { status: 400 }
      );
    }

    const imagePath = `${companyId}/avatar.webp`;
    const { error: uploadError } = await authorization.supabaseAdmin.storage
      .from(BUCKET)
      .upload(imagePath, Buffer.from(await file.arrayBuffer()), {
        contentType: "image/webp",
        cacheControl: "60",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const { error: updateError } = await authorization.supabaseAdmin
      .from("companies")
      .update({ profile_image_path: imagePath })
      .eq("id", companyId);

    if (updateError) {
      if (!authorization.company.profile_image_path) {
        await authorization.supabaseAdmin.storage
          .from(BUCKET)
          .remove([imagePath]);
      }

      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, imagePath });
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
    const { id: companyId } = await params;
    const authorization = await getAuthorizedCompany(companyId);

    if ("error" in authorization) {
      return NextResponse.json(
        { error: authorization.error },
        { status: authorization.status }
      );
    }

    const imagePath = authorization.company.profile_image_path;

    if (!imagePath) {
      return NextResponse.json({ success: true });
    }

    if (!imagePath.startsWith(`${companyId}/`)) {
      return NextResponse.json(
        { error: "La ruta de imagen de la empresa no es válida." },
        { status: 400 }
      );
    }

    const { error: updateError } = await authorization.supabaseAdmin
      .from("companies")
      .update({ profile_image_path: null })
      .eq("id", companyId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    const { error: removeError } = await authorization.supabaseAdmin.storage
      .from(BUCKET)
      .remove([imagePath]);

    if (removeError) {
      await authorization.supabaseAdmin
        .from("companies")
        .update({ profile_image_path: imagePath })
        .eq("id", companyId);

      return NextResponse.json(
        { error: removeError.message },
        { status: 500 }
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

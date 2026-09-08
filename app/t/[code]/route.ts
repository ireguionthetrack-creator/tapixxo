import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getCodeManagementAccess } from "@/lib/code-management";
import { CODE_EDIT_MODE_COOKIE } from "@/lib/code-edit-mode";

async function getSignedInUserId() {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  return user?.id ?? null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const { data, error } = await supabase
    .from("codes")
    .select("id, code, destination_url, active, company_id, group_id")
    .eq("code", code)
    .eq("active", true)
    .single();

  if (error || !data) {
    const userId = await getSignedInUserId();
    return NextResponse.redirect(new URL(userId ? "/dashboard" : "/", request.url));
  }

  if (!data.destination_url) {
    return NextResponse.redirect(
      new URL(`/t/${encodeURIComponent(data.code)}/sin-configurar`, request.url)
    );
  }

  const userId = await getSignedInUserId();
  if (userId) {
    try {
      const access = await getCodeManagementAccess(userId, data);
      const cookieStore = await cookies();
      const editModeCompanyId = cookieStore.get(CODE_EDIT_MODE_COOKIE)?.value;
      if (
        access.canManage &&
        access.role === "company" &&
        access.companyId &&
        editModeCompanyId === access.companyId
      ) {
        return NextResponse.redirect(
          new URL(`/t/${encodeURIComponent(data.code)}/redirigiendo`, request.url)
        );
      }
    } catch (accessError) {
      console.error("No se pudo comprobar el acceso de configuración del código", {
        message: accessError instanceof Error ? accessError.message : "Error desconocido",
      });
    }
  }

  await supabase.from("code_scans").insert({
    code_id: data.id,
  });

  return NextResponse.redirect(data.destination_url);
}

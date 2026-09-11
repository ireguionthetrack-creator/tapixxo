import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getCodeManagementAccess } from "@/lib/code-management";
import { CODE_EDIT_MODE_COOKIE } from "@/lib/code-edit-mode";
import { createAdminClient } from "@/lib/supabase/admin";

type ResolvedCodeDestination = {
  code_id: string;
  code: string;
  destination_url: string | null;
  active: boolean;
  company_id: string | null;
  group_id: string | null;
  schedule_id: string | null;
  schedule_rule_id: string | null;
  destination_source: string | null;
};

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

  let resolved: ResolvedCodeDestination | null = null;
  let scanWithAdmin = false;

  // Los horarios se resuelven con una única RPC del servidor. El fallback
  // conserva el comportamiento histórico durante el despliegue de la
  // migración, sin exponer tablas de horarios al navegador.
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .rpc("resolve_public_code_destination", {
        p_code: code,
        p_scanned_at: new Date().toISOString(),
      })
      .maybeSingle();
    if (!error && data) {
      resolved = data as ResolvedCodeDestination;
      scanWithAdmin = true;
    } else if (error) {
      console.error("Scheduled destination resolution failed", {
        code: error.code,
        message: error.message,
      });
    }
  } catch (error) {
    console.error("Scheduled destination resolver unavailable", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  if (!resolved) {
    const { data, error } = await supabase
      .from("codes")
      .select("id, code, destination_url, active, company_id, group_id")
      .eq("code", code)
      .eq("active", true)
      .maybeSingle();

    if (error || !data) {
      const userId = await getSignedInUserId();
      return NextResponse.redirect(new URL(userId ? "/dashboard" : "/", request.url));
    }

    resolved = {
      code_id: data.id,
      code: data.code,
      destination_url: data.destination_url,
      active: data.active,
      company_id: data.company_id,
      group_id: data.group_id,
      schedule_id: null,
      schedule_rule_id: null,
      destination_source: "primary",
    };
  }

  if (!resolved.destination_url) {
    return NextResponse.redirect(
      new URL(`/t/${encodeURIComponent(resolved.code)}/sin-configurar`, request.url)
    );
  }

  const userId = await getSignedInUserId();
  if (userId) {
    try {
      const access = await getCodeManagementAccess(userId, {
        company_id: resolved.company_id,
        group_id: resolved.group_id,
      });
      const cookieStore = await cookies();
      const editModeCompanyId = cookieStore.get(CODE_EDIT_MODE_COOKIE)?.value;
      if (
        access.canManage &&
        access.role === "company" &&
        access.companyId &&
        editModeCompanyId === access.companyId
      ) {
        return NextResponse.redirect(
          new URL(`/t/${encodeURIComponent(resolved.code)}/redirigiendo`, request.url)
        );
      }
    } catch (accessError) {
      console.error("No se pudo comprobar el acceso de configuración del código", {
        message: accessError instanceof Error ? accessError.message : "Error desconocido",
      });
    }
  }

  const scan = {
    code_id: resolved.code_id,
    schedule_id: resolved.schedule_id,
    schedule_rule_id: resolved.schedule_rule_id,
    resolved_destination_url: resolved.destination_url,
    destination_source: resolved.destination_source ?? "primary",
  };
  if (scanWithAdmin) {
    await createAdminClient().from("code_scans").insert(scan);
  } else {
    await supabase.from("code_scans").insert({ code_id: resolved.code_id });
  }

  return NextResponse.redirect(resolved.destination_url);
}

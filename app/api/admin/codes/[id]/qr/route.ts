import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPermanentQrPng } from "@/lib/qr-png";

function publicCodeUrl(code: string) {
  const appUrl = process.env.TAPIXXO_APP_URL;
  if (!appUrl) throw new Error("Falta TAPIXXO_APP_URL.");

  const origin = new URL(appUrl);
  if (origin.protocol !== "https:") {
    throw new Error("TAPIXXO_APP_URL debe usar HTTPS.");
  }

  return new URL(`/t/${encodeURIComponent(code)}`, origin).toString();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll() {},
        },
      },
    );
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "No estás autenticado." }, { status: 401 });
    }

    const admin = createAdminClient();
    const [{ data: profile, error: profileError }, { id: codeId }] = await Promise.all([
      admin.from("profiles").select("role, company_id").eq("id", user.id).maybeSingle(),
      params,
    ]);
    if (profileError || !profile) {
      return NextResponse.json({ error: "No tienes permisos para descargar este QR." }, { status: 403 });
    }

    const { data: code, error: codeError } = await admin
      .from("codes")
      .select("id, code, company_id, qr_png_path")
      .eq("id", codeId)
      .maybeSingle();
    if (codeError) {
      return NextResponse.json({ error: "No se pudo consultar el código." }, { status: 500 });
    }
    if (!code || !code.qr_png_path) {
      return NextResponse.json({ error: "El QR permanente no está disponible." }, { status: 404 });
    }

    const canDownload =
      profile.role === "admin" ||
      (profile.role === "company" && profile.company_id && profile.company_id === code.company_id);
    if (!canDownload) {
      return NextResponse.json({ error: "No tienes permisos para descargar este QR." }, { status: 403 });
    }

    const png = createPermanentQrPng(publicCodeUrl(code.code), {
      foreground: [255, 255, 255, 255],
      background: [0, 0, 0, 0],
    });

    return new NextResponse(png, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${code.code}.png"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Code QR download failed", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.json({ error: "No se pudo descargar el QR." }, { status: 500 });
  }
}

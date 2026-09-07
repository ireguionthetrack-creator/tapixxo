import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPermanentQrPng } from "@/lib/qr-png";
import { createZipArchive } from "@/lib/zip-archive";

export const runtime = "nodejs";

function publicCodeUrl(code: string) {
  const appUrl = process.env.TAPIXXO_APP_URL;
  if (!appUrl) throw new Error("Falta TAPIXXO_APP_URL.");

  const origin = new URL(appUrl);
  if (origin.protocol !== "https:") {
    throw new Error("TAPIXXO_APP_URL debe usar HTTPS.");
  }

  return new URL(`/t/${encodeURIComponent(code)}`, origin).toString();
}

function safeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "grupo";
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
      { cookies: { getAll: () => cookieStore.getAll(), setAll() {} } },
    );
    const [{ data: { user }, error: authError }, { id: groupId }] = await Promise.all([
      supabaseAuth.auth.getUser(),
      params,
    ]);

    if (authError || !user) {
      return NextResponse.json({ error: "No estás autenticado." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Solo un administrador puede descargar paquetes de QR." },
        { status: 403 },
      );
    }

    const { data: group, error: groupError } = await admin
      .from("code_groups")
      .select("id, name")
      .eq("id", groupId)
      .maybeSingle();
    if (groupError) {
      return NextResponse.json({ error: "No se pudo consultar el grupo." }, { status: 500 });
    }
    if (!group) {
      return NextResponse.json({ error: "Grupo no encontrado." }, { status: 404 });
    }

    const { data: codes, error: codesError } = await admin
      .from("codes")
      .select("code, qr_png_path")
      .eq("group_id", groupId)
      .order("code", { ascending: true });
    if (codesError) {
      return NextResponse.json({ error: "No se pudieron consultar los códigos." }, { status: 500 });
    }
    if (!codes?.length) {
      return NextResponse.json({ error: "Este grupo no tiene códigos." }, { status: 404 });
    }

    if (codes.length > 1000) {
      return NextResponse.json({ error: "El grupo supera el límite de 1000 códigos." }, { status: 413 });
    }

    if (codes.some((code) => !code.qr_png_path)) {
      return NextResponse.json(
        { error: "Hay códigos del grupo que aún no tienen QR permanente." },
        { status: 409 },
      );
    }

    const zip = createZipArchive(
      codes.map((code) => ({
        name: `${safeFileName(code.code)}.png`,
        data: createPermanentQrPng(publicCodeUrl(code.code), {
          foreground: [255, 255, 255, 255],
          background: [0, 0, 0, 0],
        }),
      })),
    );

    const fileName = `qrs-${safeFileName(group.name)}.zip`;
    return new NextResponse(zip, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(zip.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("QR package download failed", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.json({ error: "No se pudo preparar el paquete de QR." }, { status: 500 });
  }
}

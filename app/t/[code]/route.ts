import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    .select("id, code, destination_url, active")
    .eq("code", code)
    .eq("active", true)
    .single();

  if (error || !data) {
    return new NextResponse("Código no encontrado", {
      status: 404,
    });
  }

  if (!data.destination_url) {
    return new NextResponse(
      "Este código no tiene un destino configurado",
      { status: 404 }
    );
  }

  await supabase.from("code_scans").insert({
    code_id: data.id,
  });

  return NextResponse.redirect(data.destination_url);
}
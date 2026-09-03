import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// El inventario no se expone al navegador: esta ruta devuelve únicamente
// la cantidad disponible necesaria para limitar el selector público.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient();
    const { data: units, error: unitsError } = await supabaseAdmin
      .from("inventory_units")
      .select("code_id")
      .eq("status", "available");

    if (unitsError) {
      return NextResponse.json(
        { error: "No se pudo consultar la disponibilidad." },
        { status: 500 }
      );
    }

    const codeIds = (units ?? []).map((unit) => unit.code_id);
    if (codeIds.length === 0) {
      return NextResponse.json(
        { available: 0 },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const { count, error: codesError } = await supabaseAdmin
      .from("codes")
      .select("id", { count: "exact", head: true })
      .in("id", codeIds)
      .is("company_id", null)
      .is("group_id", null);

    if (codesError) {
      return NextResponse.json(
        { error: "No se pudo consultar la disponibilidad." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { available: count ?? 0 },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudo consultar la disponibilidad." },
      { status: 500 }
    );
  }
}

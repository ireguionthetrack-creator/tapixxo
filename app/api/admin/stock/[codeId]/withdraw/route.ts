import { NextResponse } from "next/server";
import { getAdminClientForRequest } from "@/app/api/admin/stock/route";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ codeId: string }> }
) {
  try {
    const authorization = await getAdminClientForRequest();
    if ("response" in authorization) return authorization.response;

    const { codeId } = await params;
    const { supabaseAdmin } = authorization;
    const { data: code, error: codeError } = await supabaseAdmin
      .from("codes")
      .select("id, company_id, group_id")
      .eq("id", codeId)
      .maybeSingle();

    if (codeError) {
      return NextResponse.json({ error: codeError.message }, { status: 500 });
    }
    if (!code) {
      return NextResponse.json({ error: "El código no existe." }, { status: 404 });
    }
    if (code.company_id || code.group_id) {
      return NextResponse.json(
        { error: "Un código asignado no se puede retirar desde venta." },
        { status: 409 }
      );
    }

    const { data: unit, error: unitError } = await supabaseAdmin
      .from("inventory_units")
      .update({ status: "not_for_sale" })
      .eq("code_id", codeId)
      .eq("status", "available")
      .select("id")
      .maybeSingle();

    if (unitError) {
      return NextResponse.json({ error: unitError.message }, { status: 500 });
    }
    if (!unit) {
      return NextResponse.json(
        { error: "La placa ya no está en venta. Actualiza la página." },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno del servidor." },
      { status: 500 }
    );
  }
}

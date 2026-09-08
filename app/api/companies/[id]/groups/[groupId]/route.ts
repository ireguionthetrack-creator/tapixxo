import { NextResponse } from "next/server";
import { getCompanyGroupManagementAccess } from "@/lib/company-group-management";

type DeleteGroupBody = { replacementGroupId?: unknown };

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; groupId: string }> },
) {
  const [{ id: companyId, groupId }, body] = await Promise.all([
    params,
    request.json().catch(() => null) as Promise<DeleteGroupBody | null>,
  ]);
  const access = await getCompanyGroupManagementAccess(companyId);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const replacementGroupId =
    typeof body?.replacementGroupId === "string"
      ? body.replacementGroupId.trim()
      : "";
  if (!replacementGroupId) {
    return NextResponse.json({ error: "Selecciona el grupo al que migrar los códigos." }, { status: 400 });
  }

  const { data, error } = await access.admin
    .rpc("delete_company_code_group", {
      p_company_id: companyId,
      p_group_id: groupId,
      p_replacement_group_id: replacementGroupId,
    })
    .maybeSingle();

  if (error) {
    const message = error.message;
    if (message.includes("cannot delete the only group")) {
      return NextResponse.json({ error: "No se puede eliminar el único grupo de la empresa." }, { status: 409 });
    }
    if (message.includes("replacement group") || message.includes("group does not belong")) {
      return NextResponse.json({ error: "El grupo de destino no es válido." }, { status: 400 });
    }
    console.error("Company group deletion failed", { code: error.code, message });
    return NextResponse.json({ error: "No se pudo eliminar el grupo." }, { status: 500 });
  }

  const result = data as { migrated_codes?: number } | null;
  return NextResponse.json({ migrated_codes: result?.migrated_codes ?? 0 });
}

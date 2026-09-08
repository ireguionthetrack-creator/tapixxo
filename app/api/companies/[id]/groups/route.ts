import { NextResponse } from "next/server";
import { getCompanyGroupManagementAccess } from "@/lib/company-group-management";

type CreateGroupBody = {
  name?: unknown;
  description?: unknown;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: companyId } = await params;
  const access = await getCompanyGroupManagementAccess(companyId);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: CreateGroupBody;
  try {
    body = (await request.json()) as CreateGroupBody;
  } catch {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";

  if (!name || name.length > 100 || description.length > 300) {
    return NextResponse.json({ error: "Los datos del grupo no son válidos." }, { status: 400 });
  }

  const { data, error } = await access.admin
    .rpc("create_company_code_group", {
      p_company_id: companyId,
      p_name: name,
      p_description: description || null,
    })
    .maybeSingle();

  if (error) {
    if (error.message.includes("group limit reached")) {
      return NextResponse.json({ error: "Cada empresa puede tener un máximo de 5 grupos." }, { status: 409 });
    }
    console.error("Company group creation failed", { code: error.code, message: error.message });
    return NextResponse.json({ error: "No se pudo crear el grupo." }, { status: 500 });
  }

  return NextResponse.json({ group: data }, { status: 201 });
}

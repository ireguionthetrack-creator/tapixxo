import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCodeManagementAccess } from "@/lib/code-management";
import { CODE_EDIT_MODE_COOKIE } from "@/lib/code-edit-mode";
import { RedirectingCodeContent } from "./redirecting-code-content";

export const dynamic = "force-dynamic";

type RedirectableCode = {
  id: string;
  code: string;
  destination_url: string | null;
  company_id: string | null;
  group_id: string | null;
};

type CompanyIdentity = {
  name: string;
  profile_image_path: string | null;
};

async function getSignedInUserId() {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll() {} } }
  );
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  return user?.id ?? null;
}

export default async function RedirectingCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: requestedCode } = await params;
  const [userId, admin] = [await getSignedInUserId(), createAdminClient()];
  const { data, error } = await admin
    .from("codes")
    .select("id, code, destination_url, company_id, group_id")
    .eq("code", requestedCode)
    .eq("active", true)
    .maybeSingle();

  const code = data as RedirectableCode | null;
  if (error || !code || !code.destination_url) {
    redirect(`/t/${encodeURIComponent(requestedCode)}`);
  }

  let access: Awaited<ReturnType<typeof getCodeManagementAccess>>;
  try {
    access = await getCodeManagementAccess(userId, code);
    const cookieStore = await cookies();
    if (
      !access.canManage ||
      access.role !== "company" ||
      !access.companyId ||
      cookieStore.get(CODE_EDIT_MODE_COOKIE)?.value !== access.companyId
    ) {
      redirect(`/t/${encodeURIComponent(code.code)}`);
    }
  } catch (accessError) {
    console.error("No se pudo comprobar el acceso de configuración del código", {
      message: accessError instanceof Error ? accessError.message : "Error desconocido",
    });
    redirect(`/t/${encodeURIComponent(code.code)}`);
  }

  await admin.from("code_scans").insert({ code_id: code.id });

  const { data: company } = await admin
    .from("companies")
    .select("name, profile_image_path")
    .eq("id", access.companyId)
    .maybeSingle();

  return (
    <RedirectingCodeContent
      code={code.code}
      company={company as CompanyIdentity | null}
      configureUrl={`/companies/${access.companyId}?editCode=${encodeURIComponent(code.id)}`}
    />
  );
}

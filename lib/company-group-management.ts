import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getCompanyGroupManagementAccess(companyId: string) {
  if (!UUID_PATTERN.test(companyId)) {
    return { error: "La empresa no es válida.", status: 400 as const };
  }

  const cookieStore = await cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll() {} } },
  );
  const {
    data: { user },
    error: authError,
  } = await auth.auth.getUser();

  if (authError || !user) {
    return { error: "No estás autenticado.", status: 401 as const };
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .maybeSingle();

  const authorized =
    !profileError &&
    (profile?.role === "admin" ||
      (profile?.role === "company" && profile.company_id === companyId));

  if (!authorized) {
    return { error: "No tienes permisos para gestionar estos grupos.", status: 403 as const };
  }

  return { admin };
}

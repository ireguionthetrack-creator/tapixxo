import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

type CodeOwnership = {
  company_id: string | null;
  group_id: string | null;
};

/**
 * Admins can manage every code. Company users can only manage a code owned by
 * their own company; legacy codes inherit that ownership from their group.
 */
export async function getCodeManagementAccess(
  userId: string | null,
  code: CodeOwnership
) {
  if (!userId) return { canManage: false, companyId: null };

  const admin = createAdminClient();
  const [{ data: profile }, { data: group }] = await Promise.all([
    admin
      .from("profiles")
      .select("role, company_id")
      .eq("id", userId)
      .maybeSingle(),
    !code.company_id && code.group_id
      ? admin
          .from("code_groups")
          .select("company_id")
          .eq("id", code.group_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const companyId = code.company_id ?? group?.company_id ?? null;
  if (profile?.role === "admin") {
    return { canManage: true, companyId };
  }

  return {
    canManage: Boolean(
      profile?.role === "company" && companyId && profile.company_id === companyId
    ),
    companyId,
  };
}

export async function userCanManageCode(userId: string | null, code: CodeOwnership) {
  return (await getCodeManagementAccess(userId, code)).canManage;
}

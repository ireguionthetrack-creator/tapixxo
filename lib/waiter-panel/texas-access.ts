import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

const TEXAS_MENU_SLUG = "texasrestobar";

export type TexasWaiterPanelAccess = {
  companyId: string;
  userId: string;
};

export async function getTexasWaiterPanelAccess(): Promise<TexasWaiterPanelAccess | null> {
  const cookieStore = await cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll() {} } }
  );
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const [{ data: menu }, { data: profile }] = await Promise.all([
    admin.from("digital_menus").select("company_id").eq("slug", TEXAS_MENU_SLUG).maybeSingle(),
    admin.from("profiles").select("role, company_id").eq("id", user.id).maybeSingle(),
  ]);
  if (!menu?.company_id || !profile) return null;
  if (profile.role !== "admin" && (profile.role !== "company" || profile.company_id !== menu.company_id)) return null;

  return { companyId: menu.company_id, userId: user.id };
}

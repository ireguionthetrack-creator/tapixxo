import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

const TEXAS_MENU_SLUG = "texasrestobar";
const TEXAS_WAITER_ROLE = "texas_waiter";

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
  const { data: menu } = await admin
    .from("digital_menus")
    .select("company_id")
    .eq("slug", TEXAS_MENU_SLUG)
    .maybeSingle();
  if (!menu?.company_id) return null;

  // El rol está en app_metadata, que solo se asigna desde el servidor. La
  // cuenta de turno puede gestionar llamados, pero no editar el menú ni Tapixxo.
  const appMetadata = user.app_metadata as Record<string, unknown> | undefined;
  if (
    appMetadata?.role === TEXAS_WAITER_ROLE &&
    appMetadata.menu_slug === TEXAS_MENU_SLUG
  ) {
    return { companyId: menu.company_id, userId: user.id };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;
  if (profile.role !== "admin" && (profile.role !== "company" || profile.company_id !== menu.company_id)) return null;

  return { companyId: menu.company_id, userId: user.id };
}

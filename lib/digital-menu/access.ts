import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "./validation";

type Failure = { error: string; status: 400 | 401 | 403 | 404 | 500 };
type Actor = {
  admin: ReturnType<typeof createAdminClient>;
  userId: string;
  profile: { role: string; company_id: string | null };
};

async function getActor(): Promise<Actor | Failure> {
  const cookieStore = await cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll() {} } },
  );
  const { data: { user }, error } = await auth.auth.getUser();
  if (error || !user) return { error: "No estás autenticado.", status: 401 as const };

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile) return { error: "No se encontró tu perfil.", status: 403 as const };
  return { admin, userId: user.id, profile: profile as Actor["profile"] };
}

export async function getDigitalMenuAdminAccess(): Promise<Actor | Failure> {
  const actor = await getActor();
  if ("error" in actor) return actor;
  if (actor.profile.role !== "admin") return { error: "Solo Tapixxo puede administrar el módulo de Menú Digital.", status: 403 as const };
  return actor;
}

export async function getCompanyDigitalMenuAccess(companyId: string): Promise<(Actor & { company: { id: string; name: string; menu_digital_enabled: boolean }; menu: { id: string; company_id: string; name: string; slug: string; status: string; created_at: string; updated_at: string } }) | Failure> {
  if (!isUuid(companyId)) return { error: "La empresa no es válida.", status: 400 as const };
  const actor = await getActor();
  if ("error" in actor) return actor;

  if (actor.profile.role !== "company" || actor.profile.company_id !== companyId) {
    return { error: "Solo la empresa asignada puede editar este menú.", status: 403 as const };
  }

  const [{ data: company, error: companyError }, { data: menu, error: menuError }] = await Promise.all([
    actor.admin.from("companies").select("id, name, menu_digital_enabled").eq("id", companyId).maybeSingle(),
    actor.admin.from("digital_menus").select("id, company_id, name, slug, status, created_at, updated_at").eq("company_id", companyId).maybeSingle(),
  ]);
  if (companyError || menuError) return { error: "No se pudo comprobar el acceso al menú.", status: 500 as const };
  if (!company) return { error: "La empresa no existe.", status: 404 as const };
  // El acceso de edición depende de que exista un menú asignado a esta empresa.
  // `menu_digital_enabled` controla únicamente la publicación del menú para
  // visitantes; no debe impedir que la empresa lo configure desde Tapixxo.
  if (!menu) {
    return { error: "No hay un Menú Digital asignado a esta empresa.", status: 404 as const };
  }
  return { ...actor, company, menu };
}

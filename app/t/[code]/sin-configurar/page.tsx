import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { CompanyAvatar } from "@/app/components/company-avatar";
import { TapixxoBrand } from "@/app/components/tapixxo-brand";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type PublicCode = {
  id: string;
  code: string;
  destination_url: string | null;
  active: boolean;
  company_id: string | null;
  group_id: string | null;
};

type CompanyIdentity = {
  id: string;
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

export default async function UnconfiguredCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: requestedCode } = await params;
  const userId = await getSignedInUserId();
  const admin = createAdminClient();

  const { data: code, error: codeError } = await admin
    .from("codes")
    .select("id, code, destination_url, active, company_id, group_id")
    .eq("code", requestedCode)
    .eq("active", true)
    .maybeSingle();

  const publicCode = code as PublicCode | null;
  if (codeError || !publicCode) {
    redirect(userId ? "/dashboard" : "/");
  }

  if (publicCode.destination_url) {
    redirect(`/t/${encodeURIComponent(publicCode.code)}`);
  }

  const { data: group } =
    !publicCode.company_id && publicCode.group_id
      ? await admin
          .from("code_groups")
          .select("company_id")
          .eq("id", publicCode.group_id)
          .maybeSingle()
      : { data: null };

  // Los códigos nuevos guardan company_id directamente. El respaldo por grupo
  // mantiene la misma experiencia para códigos antiguos asociados a una empresa.
  const companyId = publicCode.company_id ?? group?.company_id ?? null;

  const [{ data: company }, { data: profile }] = await Promise.all([
    companyId
      ? admin
          .from("companies")
          .select("id, name, profile_image_path")
          .eq("id", companyId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    userId
      ? admin
          .from("profiles")
          .select("role, company_id")
          .eq("id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const companyIdentity = company as CompanyIdentity | null;
  const canConfigure =
    profile?.role === "company" &&
    Boolean(companyId) &&
    profile.company_id === companyId;

  return (
    <main className="tapixxo-shell tapixxo-grid flex min-h-screen items-center justify-center px-5 py-10 text-white">
      <section className="tapixxo-panel tapixxo-enter w-full max-w-md rounded-3xl p-6 text-center sm:p-8">
        <TapixxoBrand className="mx-auto mb-8" priority />

        {companyIdentity ? (
          <div className="flex flex-col items-center">
            <CompanyAvatar
              name={companyIdentity.name}
              imagePath={companyIdentity.profile_image_path}
              size="lg"
            />
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-orange-300">
              {companyIdentity.name}
            </p>
          </div>
        ) : (
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-300">
            Tapixxo
          </p>
        )}

        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          Esta placa aún no está configurada
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-400">
          El enlace para el código <span className="font-medium text-gray-200">{publicCode.code}</span>{" "}
          todavía no ha sido definido.
        </p>

        {canConfigure && companyId && (
          <Link
            href={`/companies/${companyId}?editCode=${encodeURIComponent(publicCode.id)}`}
            className="mt-7 inline-flex rounded-xl bg-orange-400 px-4 py-3 text-sm font-semibold text-black transition hover:bg-orange-300"
          >
            Configurar link
          </Link>
        )}
      </section>
    </main>
  );
}

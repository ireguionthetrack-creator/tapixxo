import Link from "next/link";
import { CompanyAvatar } from "@/app/components/company-avatar";
import { TapixxoBrand } from "@/app/components/tapixxo-brand";

type RedirectingCodeContentProps = {
  code: string;
  company: {
    name: string;
    profile_image_path: string | null;
  } | null;
  configureUrl: string;
};

export function RedirectingCodeContent({
  code,
  company,
  configureUrl,
}: RedirectingCodeContentProps) {
  return (
    <main className="tapixxo-shell tapixxo-grid flex min-h-screen items-center justify-center px-5 py-10 text-white">
      <section className="tapixxo-panel tapixxo-enter w-full max-w-md rounded-3xl p-6 text-center sm:p-8">
        <TapixxoBrand className="mx-auto mb-8" priority />

        {company ? (
          <div className="flex flex-col items-center">
            <CompanyAvatar
              name={company.name}
              imagePath={company.profile_image_path}
              size="lg"
            />
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-orange-300">
              {company.name}
            </p>
          </div>
        ) : null}

        <p className="mt-5 text-xs font-medium uppercase tracking-[0.18em] text-orange-300">
          Modo edición activo
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Esta placa está configurada
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-400">
          El enlace para el código <span className="font-medium text-gray-200">{code}</span>{" "}
          está listo. Puedes cambiarlo desde su configuración.
        </p>

        <Link
          href={configureUrl}
          className="mt-7 inline-flex rounded-xl bg-orange-400 px-4 py-3 text-sm font-semibold text-black transition hover:bg-orange-300"
        >
          Configurar link
        </Link>
      </section>
    </main>
  );
}

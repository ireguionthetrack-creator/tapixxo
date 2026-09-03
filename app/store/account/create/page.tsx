import Link from "next/link";
import { StoreHeader } from "@/app/components/store-header";

export default async function StoreAccountCreatePage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string | string[] }>;
}) {
  const { reference } = await searchParams;
  const safeReference = typeof reference === "string" && /^TPX-\d{6}$/.test(reference)
    ? reference
    : null;

  return (
    <main className="tapixxo-shell min-h-screen text-white">
      <StoreHeader />
      <section className="mx-auto max-w-xl px-5 py-16 sm:py-24">
        <div className="tapixxo-panel rounded-3xl p-7 text-center sm:p-9">
          <p className="text-xs font-medium uppercase tracking-[.18em] text-orange-300">Tapixxo Store</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Creación de cuenta próximamente</h1>
          <p className="mt-4 leading-7 text-gray-400">
            Tu pago y tu placa quedan asociados al pedido{safeReference ? ` ${safeReference}` : ""}. El formulario seguro para crear tu cuenta se incorporará en la siguiente fase.
          </p>
          <Link href="/store" className="mt-8 inline-flex rounded-xl bg-orange-400 px-5 py-3 font-semibold text-black hover:bg-orange-300">Volver a la Store</Link>
        </div>
      </section>
    </main>
  );
}

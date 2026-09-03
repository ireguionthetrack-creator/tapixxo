import Link from "next/link";
import { ProductVisual } from "@/app/components/product-visual";
import { StoreHeader } from "@/app/components/store-header";
import { formatBasePrice, tapixxoNfcProduct } from "@/lib/store/catalog";

export default function StorePage() {
  return (
    <main className="tapixxo-shell min-h-screen text-white">
      <StoreHeader />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[440px] w-[440px] -translate-x-1/2 rounded-full bg-orange-500/10 blur-[140px]" />
        <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-28">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-orange-400">Tapixxo Store</p>
          <div className="mt-5 max-w-2xl">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Lleva Tapixxo a tu espacio.
            </h1>
            <p className="mt-5 text-base leading-7 text-gray-400 sm:text-lg sm:leading-8">
              Placas físicas pensadas para convertir una interacción en una conexión inmediata.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-orange-400">Producto</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">La primera placa Tapixxo</h2>
          </div>
          <span className="hidden rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-400 sm:inline-flex">
            NFC + QR
          </span>
        </div>

        <article className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] transition hover:border-orange-400/35 hover:bg-white/[0.045]">
          <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <ProductVisual
              alt={tapixxoNfcProduct.name}
              imageSrc={tapixxoNfcProduct.imageSrc}
              label="Tapixxo NFC"
              className="aspect-[4/3] min-h-[260px] lg:min-h-full"
            />
            <div className="flex flex-col p-6 sm:p-8 lg:p-10">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-300">Placa física</p>
                <h3 className="mt-3 text-3xl font-semibold tracking-tight">{tapixxoNfcProduct.name}</h3>
                <p className="mt-4 max-w-xl text-sm leading-7 text-gray-400 sm:text-base">
                  {tapixxoNfcProduct.shortDescription}
                </p>
              </div>
              <div className="mt-8 flex flex-wrap items-end justify-between gap-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Precio base</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {formatBasePrice(tapixxoNfcProduct.basePriceCop)}
                  </p>
                </div>
                <Link
                  href={`/store/${tapixxoNfcProduct.slug}`}
                  className="rounded-xl bg-orange-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-300 hover:shadow-[0_0_28px_rgba(255,122,26,0.25)]"
                >
                  Ver producto
                </Link>
              </div>
            </div>
          </div>
        </article>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Tapixxo</p>
          <p>Conectando lo físico con lo digital.</p>
        </div>
      </footer>
    </main>
  );
}

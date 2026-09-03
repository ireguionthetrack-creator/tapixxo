import Link from "next/link";
import { StoreHeader } from "@/app/components/store-header";

export default function WompiPaymentReturnPage() {
  return (
    <main className="tapixxo-shell min-h-screen text-white">
      <StoreHeader />
      <section className="mx-auto max-w-xl px-5 py-16 sm:py-24">
        <div className="tapixxo-panel rounded-3xl p-7 text-center sm:p-9">
          <p className="text-xs font-medium uppercase tracking-[.18em] text-orange-300">
            Tapixxo Store
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Estamos verificando tu pago</h1>
          <p className="mt-4 leading-7 text-gray-400">
            La confirmación del pedido ocurre de forma segura cuando Tapixxo recibe y valida el
            evento de Wompi. Esta pantalla no confirma ni modifica el pago.
          </p>
          <Link
            href="/store"
            className="mt-8 inline-flex rounded-xl bg-orange-400 px-5 py-3 font-semibold text-black hover:bg-orange-300"
          >
            Volver a la tienda
          </Link>
        </div>
      </section>
    </main>
  );
}

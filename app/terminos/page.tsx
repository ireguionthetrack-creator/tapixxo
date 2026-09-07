import Link from "next/link";
import { StoreHeader } from "@/app/components/store-header";

const termsVersion = "2026-09-03";

export default function TermsPage() {
  return (
    <main className="tapixxo-shell min-h-screen text-white">
      <StoreHeader />
      <section className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
        <article className="tapixxo-panel rounded-3xl p-7 sm:p-10">
          <p className="text-xs font-medium uppercase tracking-[.18em] text-orange-300">Tapixxo</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Términos y Condiciones</h1>
          <p className="mt-3 text-sm text-gray-400">Versión {termsVersion} · Pendiente de revisión legal antes de producción.</p>
          <div className="mt-8 space-y-6 text-sm leading-7 text-gray-300">
            <section><h2 className="font-semibold text-white">Uso del servicio</h2><p>Tapixxo ofrece herramientas para vincular placas NFC y configurar sus destinos digitales desde el panel correspondiente.</p></section>
            <section><h2 className="font-semibold text-white">Placas físicas</h2><p>La compra online de placas físicas está temporalmente no disponible. Cada placa se vincula a un único código existente.</p></section>
            <section><h2 className="font-semibold text-white">Pagos y activación</h2><p>El pago se procesa mediante el proveedor habilitado. Tras confirmarse, la placa se prepara para su cuenta y el destino se configura posteriormente desde el panel.</p></section>
            <section><h2 className="font-semibold text-white">Limitación razonable</h2><p>El servicio se presta según su disponibilidad y el uso adecuado de la plataforma. Estas condiciones son un resumen operativo y requieren revisión legal antes de su publicación definitiva.</p></section>
            <section><h2 className="font-semibold text-white">Contacto</h2><p>Para consultas sobre una compra o el servicio, contacta a Tapixxo por los canales oficiales.</p></section>
          </div>
          <Link href="/" className="mt-9 inline-flex rounded-xl bg-orange-400 px-5 py-3 font-semibold text-black hover:bg-orange-300">Volver al inicio</Link>
        </article>
      </section>
    </main>
  );
}

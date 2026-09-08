import Link from "next/link";
import { TapixxoBrand } from "@/app/components/tapixxo-brand";

export default function NotFound() {
  return (
    <main className="tapixxo-shell tapixxo-grid flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 text-white">
      <section className="tapixxo-panel tapixxo-enter relative w-full max-w-lg overflow-hidden rounded-[2rem] p-7 text-center shadow-[0_28px_80px_rgba(0,0,0,0.42)] sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-orange-300/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

        <TapixxoBrand className="relative mx-auto" priority />

        <div className="relative mt-10 inline-flex items-center gap-3 rounded-full border border-orange-300/30 bg-orange-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-xl">
          <span className="h-2 w-2 rounded-full bg-orange-300 shadow-[0_0_14px_rgba(253,186,116,0.9)]" />
          Error 404
        </div>

        <h1 className="relative mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
          Esta ruta no existe
        </h1>
        <p className="relative mx-auto mt-4 max-w-sm text-sm leading-6 text-gray-400 sm:text-base">
          Puede que el enlace haya cambiado o que la página ya no esté disponible.
        </p>

        <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-orange-400 px-5 text-sm font-semibold text-black shadow-[0_12px_28px_rgba(249,115,22,0.24)] transition hover:-translate-y-0.5 hover:bg-orange-300"
          >
            Volver al inicio
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/[0.15] bg-white/[0.07] px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-orange-300/45 hover:bg-orange-300/10"
          >
            Iniciar sesión
          </Link>
        </div>
      </section>
    </main>
  );
}

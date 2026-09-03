import Link from "next/link";
import { TapixxoBrand } from "@/app/components/tapixxo-brand";

export function StoreHeader() {
  return (
    <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Tapixxo">
          <TapixxoBrand priority />
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Navegación principal">
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/5 hover:text-white"
          >
            Inicio
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-white/15 px-3.5 py-2 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/5 sm:px-5 sm:py-2.5"
          >
            Iniciar sesión
          </Link>
        </nav>
      </div>
    </header>
  );
}

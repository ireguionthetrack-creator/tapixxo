"use client";

import { useEffect } from "react";
import Link from "next/link";

type RedirectingCodeContentProps = {
  destinationUrl: string;
  configureUrl: string;
};

export function RedirectingCodeContent({
  destinationUrl,
  configureUrl,
}: RedirectingCodeContentProps) {
  useEffect(() => {
    const redirectTimer = window.setTimeout(() => {
      window.location.replace(destinationUrl);
    }, 2200);

    return () => window.clearTimeout(redirectTimer);
  }, [destinationUrl]);

  return (
    <main className="tapixxo-shell flex min-h-screen items-center justify-center px-5 py-10 text-white">
      <p className="tapixxo-panel tapixxo-enter rounded-full px-5 py-3 text-sm text-gray-300">
        Abriendo enlace…
      </p>

      <Link
        href={configureUrl}
        aria-label="Configurar link de esta placa"
        title="Configurar link"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-orange-300/50 bg-orange-400 text-2xl text-black shadow-[0_10px_35px_rgba(255,122,26,0.38)] transition hover:bg-orange-300 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#100d0b]"
      >
        <span aria-hidden="true">⚙</span>
      </Link>
    </main>
  );
}

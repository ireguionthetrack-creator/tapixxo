"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { StoreHeader } from "@/app/components/store-header";

export function PaymentReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");
  const [state, setState] = useState<"loading" | "processing" | "assigned" | "guest" | "needs_review" | "error">("loading");
  const [message, setMessage] = useState("Estamos verificando tu pago.");

  const loadStatus = useCallback(async () => {
    if (!reference || !/^TPX-\d{6}$/.test(reference)) {
      setState("error");
      setMessage("No se encontró una referencia de pedido válida.");
      return false;
    }

    const response = await fetch(`/api/store/payment-return?reference=${encodeURIComponent(reference)}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) {
      setState("error");
      setMessage(result.error ?? "No se pudo consultar el pedido.");
      return false;
    }

    if (result.audience === "authenticated" && result.payment_status === "paid" && result.stock_capture_status === "captured" && result.assignment_status === "assigned") {
      setState("assigned");
      setMessage("Pago aprobado. Tu nueva placa ya está en tu panel.");
      window.setTimeout(() => router.replace(`/companies/${result.company_id}`), 1200);
      return true;
    }

    if (result.audience === "guest" && result.payment_status === "paid" && result.stock_capture_status === "captured") {
      setState("guest");
      setMessage("Pago aprobado. Tu placa está reservada para este pedido y ya no está disponible en la tienda.");
      return true;
    }

    if (result.assignment_status === "needs_review") {
      setState("needs_review");
      setMessage("Tu pago fue recibido y la preparación necesita revisión. Te contactaremos por los canales oficiales.");
      return true;
    }

    setState("processing");
    setMessage("Estamos terminando de preparar tu compra.");
    return false;
  }, [reference, router]);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timer: number | undefined;

    async function poll() {
      const complete = await loadStatus();
      attempts += 1;
      if (!cancelled && !complete && attempts < 15) timer = window.setTimeout(poll, 2000);
    }
    void poll();
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
  }, [loadStatus]);

  return (
    <main className="tapixxo-shell min-h-screen text-white">
      <StoreHeader />
      <section className="mx-auto max-w-xl px-5 py-16 sm:py-24">
        <div className="tapixxo-panel rounded-3xl p-7 text-center sm:p-9">
          <p className="text-xs font-medium uppercase tracking-[.18em] text-orange-300">Tapixxo Store</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {state === "guest" || state === "assigned" ? "Pago aprobado" : "Estamos verificando tu pago"}
          </h1>
          <p className="mt-4 leading-7 text-gray-400">
            {message} Esta pantalla solo consulta el estado confirmado por el webhook de Wompi; nunca modifica el pago.
          </p>
          {state === "guest" && reference && <Link href={`/store/account/create?reference=${encodeURIComponent(reference)}`} className="mt-7 inline-flex rounded-xl bg-orange-400 px-5 py-3 font-semibold text-black hover:bg-orange-300">Crear mi cuenta</Link>}
          {state === "assigned" && <Link href="/dashboard" className="mt-7 inline-flex rounded-xl bg-orange-400 px-5 py-3 font-semibold text-black hover:bg-orange-300">Ir a mi panel</Link>}
          <Link href="/store" className="mt-8 inline-flex rounded-xl border border-white/15 px-5 py-3 font-semibold text-white hover:bg-white/5">Volver a la tienda</Link>
        </div>
      </section>
    </main>
  );
}

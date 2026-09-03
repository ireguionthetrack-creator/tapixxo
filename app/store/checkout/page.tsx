"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StoreHeader } from "@/app/components/store-header";
import { createClient } from "@/lib/supabase/client";
import { formatBasePrice, tapixxoNfcProduct } from "@/lib/store/catalog";
import {
  formatCop,
  formatShippingCop,
  shippingOptions,
  shippingRatesCop,
  type ShippingClassification,
} from "@/lib/store/shipping";

type Selection = { productKey: string; modelKey: string; quantity: number };
type PreparedOrder = {
  order_id: string;
  order_reference: string;
  product_name: string;
  model_name: string;
  quantity: number;
  unit_price_cop: number;
  subtotal_cop: number;
  shipping_cop: number;
  total_cop: number;
  currency: string;
  payment_status: "pending";
  fulfillment_status: "pending";
};

const initialForm = {
  first_name: "",
  last_name: "",
  business_name: "",
  email: "",
  phone: "",
  country: "Colombia",
  department_state: "",
  city: "",
  address: "",
  address_extra: "",
};

export default function CheckoutPage() {
  const [selection, setSelection] = useState<Selection | null | undefined>(undefined);
  const [form, setForm] = useState(initialForm);
  const [shippingClassification, setShippingClassification] =
    useState<ShippingClassification>("cartagena");
  const [available, setAvailable] = useState<number | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [clientRequestId, setClientRequestId] = useState("");
  const [error, setError] = useState("");
  const [loginUrl, setLoginUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [preparedOrder, setPreparedOrder] = useState<PreparedOrder | null>(null);
  const [startingPayment, setStartingPayment] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const quantity = Number.parseInt(params.get("quantity") ?? "", 10);
    const productKey = params.get("product_key") ?? "";
    const modelKey = params.get("model_key") ?? "";

    const initializeSelection = window.setTimeout(() => {
      if (
        productKey === tapixxoNfcProduct.slug &&
        tapixxoNfcProduct.models.some((model) => model.id === modelKey) &&
        Number.isInteger(quantity) &&
        quantity > 0
      ) {
        setSelection({ productKey, modelKey, quantity });
      } else {
        setSelection(null);
      }
      setClientRequestId(crypto.randomUUID());
    }, 0);

    async function loadContext() {
      try {
        const supabase = createClient();
        const [availabilityResponse, authResult] = await Promise.all([
          fetch("/api/store/availability", { cache: "no-store" }),
          supabase.auth.getUser(),
        ]);
        const availabilityResult = await availabilityResponse.json();
        if (availabilityResponse.ok && typeof availabilityResult.available === "number") {
          setAvailable(Math.max(0, availabilityResult.available));
        }
        if (authResult.data.user?.email) {
          const email = authResult.data.user.email;
          setAccountEmail(email);
          setForm((current) => ({ ...current, email }));
        }
      } catch {
        setError("No se pudo consultar la disponibilidad actual.");
      }
    }

    loadContext();
    // The initial selection and session are intentionally resolved once in the browser.
    return () => window.clearTimeout(initializeSelection);
  }, []);

  const model = useMemo(
    () => tapixxoNfcProduct.models.find((item) => item.id === selection?.modelKey) ?? null,
    [selection]
  );
  const unitPriceCop = tapixxoNfcProduct.basePriceCop;
  const shippingCop = shippingRatesCop[shippingClassification];
  const subtotalCop = unitPriceCop === null || !selection ? null : unitPriceCop * selection.quantity;
  const totalCop = subtotalCop === null || shippingCop === null ? null : subtotalCop + shippingCop;
  const hasEnoughStock = available === null || !selection ? false : selection.quantity <= available;
  const canSubmit = Boolean(
    selection &&
      model &&
      clientRequestId &&
      unitPriceCop !== null &&
      shippingCop !== null &&
      hasEnoughStock &&
      termsAccepted &&
      !submitting
  );

  function updateField(name: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selection || !model) return;
    setError("");
    setLoginUrl("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/store/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_request_id: clientRequestId,
          product_key: selection.productKey,
          model_key: selection.modelKey,
          quantity: selection.quantity,
          shipping_classification: shippingClassification,
          terms_accepted: termsAccepted,
          ...form,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "No se pudo preparar el pedido.");
        setLoginUrl(result.login_url ?? "");
        return;
      }
      setPreparedOrder(result.order);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSubmitting(false);
    }
  }

  async function startWompiPayment() {
    if (!preparedOrder) return;
    setError("");
    setStartingPayment(true);

    try {
      const response = await fetch("/api/payments/wompi/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: preparedOrder.order_id }),
      });
      const result = await response.json();
      if (!response.ok || !result.checkout_url || !result.fields) {
        setError(result.error ?? "No se pudo iniciar el pago.");
        return;
      }

      const paymentForm = document.createElement("form");
      paymentForm.method = "GET";
      paymentForm.action = result.checkout_url;
      for (const [name, value] of Object.entries(result.fields as Record<string, string>)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        paymentForm.append(input);
      }
      document.body.append(paymentForm);
      paymentForm.submit();
    } catch {
      setError("No se pudo conectar con el servidor de pago.");
    } finally {
      setStartingPayment(false);
    }
  }

  if (selection === undefined) {
    return <main className="tapixxo-shell flex min-h-screen items-center justify-center text-sm text-gray-400">Preparando checkout...</main>;
  }

  if (!selection || !model) {
    return (
      <main className="tapixxo-shell min-h-screen text-white">
        <StoreHeader />
        <section className="mx-auto max-w-xl px-5 py-20 text-center">
          <h1 className="text-3xl font-semibold">Selecciona una placa para continuar</h1>
          <p className="mt-4 text-gray-400">El checkout necesita un producto, modelo y cantidad válidos.</p>
          <Link href="/store/tapixxo-nfc" className="mt-7 inline-flex rounded-xl bg-orange-400 px-5 py-3 font-semibold text-black">Volver al producto</Link>
        </section>
      </main>
    );
  }

  if (preparedOrder) {
    return (
      <main className="tapixxo-shell min-h-screen text-white">
        <StoreHeader />
        <section className="mx-auto max-w-xl px-5 py-16 sm:py-24">
          <div className="tapixxo-panel rounded-3xl p-7 sm:p-9">
            <p className="text-xs font-medium uppercase tracking-[.18em] text-orange-300">Tapixxo Store</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Pedido preparado</h1>
            <p className="mt-3 text-gray-400">Número: <span className="font-mono text-orange-100">{preparedOrder.order_reference}</span></p>
            <div className="mt-7 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm">
              <p className="font-medium">{preparedOrder.product_name}</p>
              <p className="text-gray-400">{preparedOrder.model_name} · Cantidad {preparedOrder.quantity}</p>
              <p className="text-gray-400">Total <span className="font-semibold text-white">{formatCop(preparedOrder.total_cop)}</span></p>
            </div>
            <p className="mt-6 inline-flex rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-sm font-medium text-amber-100">Pendiente de pago</p>
            <div className="mt-7 rounded-2xl border border-dashed border-white/15 p-5">
              <p className="font-medium">Continuar al pago</p>
              <p className="mt-2 text-sm leading-6 text-gray-400">Serás llevado al Checkout seguro de Wompi Sandbox.</p>
              {error && <p className="mt-3 text-sm text-red-200">{error}</p>}
              <button type="button" onClick={startWompiPayment} disabled={startingPayment} className="mt-5 w-full rounded-xl bg-orange-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-gray-500">{startingPayment ? "Abriendo Wompi..." : "Pagar con Wompi"}</button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="tapixxo-shell min-h-screen text-white">
      <StoreHeader />
      <section className="mx-auto max-w-6xl px-5 py-8 sm:py-12">
        <Link href={`/store/${tapixxoNfcProduct.slug}`} className="text-sm text-gray-400 hover:text-orange-200">← Volver al producto</Link>
        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <form onSubmit={submitOrder} className="tapixxo-panel rounded-3xl p-5 sm:p-7">
            <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
            {accountEmail && <p className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[.07] px-4 py-3 text-sm text-emerald-100">Estás comprando con tu cuenta Tapixxo.</p>}
            <fieldset className="mt-7 grid gap-4 sm:grid-cols-2">
              <legend className="mb-1 text-sm font-medium uppercase tracking-[.16em] text-orange-300 sm:col-span-2">Datos del comprador</legend>
              <CheckoutInput label="Nombre" value={form.first_name} onChange={(value) => updateField("first_name", value)} required />
              <CheckoutInput label="Apellido" value={form.last_name} onChange={(value) => updateField("last_name", value)} required />
              <CheckoutInput label="Empresa / negocio" value={form.business_name} onChange={(value) => updateField("business_name", value)} />
              <CheckoutInput label="Teléfono" type="tel" value={form.phone} onChange={(value) => updateField("phone", value)} required />
              <CheckoutInput label="Email" type="email" value={form.email} onChange={(value) => updateField("email", value)} required disabled={Boolean(accountEmail)} className="sm:col-span-2" />
            </fieldset>
            <label className="mt-7 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-gray-300">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(event) => setTermsAccepted(event.target.checked)}
                className="mt-1 h-4 w-4 accent-orange-400"
              />
              <span>
                He leído y acepto los{" "}
                <Link href="/terminos" className="font-medium text-orange-200 underline hover:text-orange-100">
                  Términos y Condiciones
                </Link>
                .
              </span>
            </label>
            <fieldset className="mt-8 grid gap-4 sm:grid-cols-2">
              <legend className="mb-1 text-sm font-medium uppercase tracking-[.16em] text-orange-300 sm:col-span-2">Entrega</legend>
              <CheckoutInput label="País" value={form.country} onChange={(value) => updateField("country", value)} required />
              <CheckoutInput label="Departamento / estado" value={form.department_state} onChange={(value) => updateField("department_state", value)} required />
              <CheckoutInput label="Ciudad" value={form.city} onChange={(value) => updateField("city", value)} required />
              <label className="text-sm text-gray-300">Clasificación de envío<select value={shippingClassification} onChange={(event) => setShippingClassification(event.target.value as ShippingClassification)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-orange-400/60">{shippingOptions.map((option) => <option key={option.id} value={option.id} disabled={option.disabled}>{option.name} — {option.unavailableLabel ?? formatShippingCop(shippingRatesCop[option.id])}</option>)}</select></label>
              <CheckoutInput label="Dirección" value={form.address} onChange={(value) => updateField("address", value)} required className="sm:col-span-2" />
              <CheckoutInput label="Información adicional" value={form.address_extra} onChange={(value) => updateField("address_extra", value)} className="sm:col-span-2" />
            </fieldset>
            {error && <div className="mt-6 rounded-xl border border-red-400/20 bg-red-950/40 px-4 py-3 text-sm text-red-200"><p>{error}</p>{loginUrl && <Link href={loginUrl} className="mt-3 inline-flex font-medium text-orange-200 underline">Iniciar sesión</Link>}</div>}
            <button type="submit" disabled={!canSubmit} className="mt-8 w-full rounded-xl bg-orange-400 px-5 py-4 text-sm font-semibold text-black transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-gray-500">{submitting ? "Preparando pedido..." : "Continuar hacia el pago"}</button>
            {unitPriceCop === null && <p className="mt-3 text-center text-sm text-amber-200">Este producto todavía no está disponible para compra.</p>}
            {shippingCop === null && <p className="mt-2 text-center text-sm text-amber-200">{shippingOptions.find((option) => option.id === shippingClassification)?.unavailableLabel ?? "La tarifa de envío elegida todavía no está configurada."}</p>}
            {available !== null && !hasEnoughStock && <p className="mt-2 text-center text-sm text-red-200">Solo hay {available} unidades disponibles actualmente.</p>}
          </form>
          <aside className="tapixxo-panel h-fit rounded-3xl p-5 sm:p-6"><p className="text-xs font-medium uppercase tracking-[.16em] text-orange-300">Resumen</p><h2 className="mt-3 text-xl font-semibold">{tapixxoNfcProduct.name}</h2><p className="mt-2 text-sm text-gray-400">{model.name} · Cantidad {selection.quantity}</p><dl className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm"><SummaryRow label="Precio unitario" value={formatBasePrice(unitPriceCop)} /><SummaryRow label="Subtotal" value={formatCop(subtotalCop)} /><SummaryRow label="Envío" value={formatShippingCop(shippingCop)} /><SummaryRow label="Total" value={formatCop(totalCop)} strong /></dl><p className="mt-5 text-xs leading-5 text-gray-500">El total se vuelve a calcular en el servidor al preparar el pedido.</p></aside>
        </div>
      </section>
    </main>
  );
}

function CheckoutInput({ label, value, onChange, type = "text", required, disabled, className = "" }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; disabled?: boolean; className?: string }) {
  return <label className={`text-sm text-gray-300 ${className}`}>{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} disabled={disabled} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-orange-400/60 disabled:opacity-60" /></label>;
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between gap-4 ${strong ? "text-base font-semibold text-white" : "text-gray-400"}`}><dt>{label}</dt><dd className="text-right">{value}</dd></div>;
}

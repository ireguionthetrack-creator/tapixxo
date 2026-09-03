"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProductVisual } from "@/app/components/product-visual";
import { StoreHeader } from "@/app/components/store-header";
import { formatBasePrice, tapixxoNfcProduct } from "@/lib/store/catalog";

export default function TapixxoNfcProductPage() {
  const [selectedModelId, setSelectedModelId] = useState(tapixxoNfcProduct.models[0].id);
  const [quantity, setQuantity] = useState(1);
  const [available, setAvailable] = useState<number | null>(null);
  const [availabilityError, setAvailabilityError] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function loadAvailability() {
      try {
        const response = await fetch("/api/store/availability", { cache: "no-store" });
        const result = await response.json();

        if (!response.ok || typeof result.available !== "number") {
          throw new Error("availability");
        }

        if (!active) return;

        const availableNow = Math.max(0, result.available);
        setAvailable(availableNow);
        setQuantity((currentQuantity) => Math.max(1, Math.min(currentQuantity, availableNow || 1)));
      } catch {
        if (active) setAvailabilityError(true);
      }
    }

    loadAvailability();

    return () => {
      active = false;
    };
  }, []);

  const selectedModel = tapixxoNfcProduct.models.find((model) => model.id === selectedModelId) ?? tapixxoNfcProduct.models[0];
  const isAvailable = available !== null && available > 0;
  const canIncrease = isAvailable && quantity < available;

  return (
    <main className="tapixxo-shell min-h-screen text-white">
      <StoreHeader />

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        <Link href="/store" className="inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-orange-200">
          <span aria-hidden="true">←</span> Volver a la Store
        </Link>

        <div className="mt-7 grid gap-8 lg:mt-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:gap-14">
          <div className="space-y-4">
            <ProductVisual
              alt={`${tapixxoNfcProduct.name}, ${selectedModel.name}`}
              imageSrc={selectedModel.imageSrc ?? tapixxoNfcProduct.imageSrc}
              label={selectedModel.name}
              className="aspect-square rounded-3xl border border-white/10"
            />
            <p className="px-1 text-xs leading-5 text-gray-500">
              Imagen de referencia. La fotografía final podrá sustituirse sin cambiar la ficha del producto.
            </p>
          </div>

          <section>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-orange-400">Placa física NFC + QR</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{tapixxoNfcProduct.name}</h1>
            <p className="mt-5 text-base leading-7 text-gray-400 sm:text-lg sm:leading-8">
              {tapixxoNfcProduct.description}
            </p>

            <div className="mt-7 border-y border-white/10 py-6">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Precio base</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{formatBasePrice(tapixxoNfcProduct.basePriceCop)}</p>
              <p className="mt-2 text-sm text-gray-500">El modelo seleccionado no cambia el precio: +$0 COP.</p>
            </div>

            <div className="mt-7">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-base font-semibold">Elige un modelo</h2>
                <span className="text-xs text-gray-500">Mismo precio</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {tapixxoNfcProduct.models.map((model) => {
                  const selected = selectedModelId === model.id;

                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => {
                        setSelectedModelId(model.id);
                      }}
                      aria-pressed={selected}
                      className={`overflow-hidden rounded-2xl border text-left transition ${selected ? "border-orange-400 bg-orange-400/[0.08] shadow-[0_0_0_1px_rgba(255,122,26,0.18)]" : "border-white/10 bg-white/[0.025] hover:border-white/25"}`}
                    >
                      <ProductVisual
                        alt={model.name}
                        imageSrc={model.imageSrc}
                        label={model.name}
                        className="aspect-[4/3]"
                      />
                      <span className="block p-3">
                        <span className="block text-sm font-medium">{model.name}</span>
                        <span className="mt-1 block text-xs leading-5 text-gray-500">{model.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-end justify-between gap-5 border-t border-white/10 pt-7">
              <div>
                <p className="text-sm font-medium">Cantidad</p>
                <div className="mt-3 inline-flex items-center rounded-xl border border-white/10 bg-black/25">
                  <button
                    type="button"
                    aria-label="Reducir cantidad"
                    disabled={!isAvailable || quantity <= 1}
                    onClick={() => setQuantity((currentQuantity) => Math.max(1, currentQuantity - 1))}
                    className="h-11 w-11 text-lg text-gray-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    −
                  </button>
                  <span className="w-11 text-center font-semibold" aria-live="polite">{quantity}</span>
                  <button
                    type="button"
                    aria-label="Aumentar cantidad"
                    disabled={!canIncrease}
                    onClick={() => setQuantity((currentQuantity) => currentQuantity + 1)}
                    className="h-11 w-11 text-lg text-gray-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="text-right">
                {availabilityError ? (
                  <p className="text-sm text-red-300">Disponibilidad no disponible</p>
                ) : available === null ? (
                  <p className="text-sm text-gray-400">Consultando disponibilidad...</p>
                ) : isAvailable ? (
                  <p className="inline-flex rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-sm font-medium text-emerald-200">Disponible</p>
                ) : (
                  <p className="inline-flex rounded-full border border-red-400/25 bg-red-400/10 px-3 py-1.5 text-sm font-medium text-red-200">Agotado</p>
                )}
                <p className="mt-2 max-w-xs text-xs leading-5 text-gray-500">La disponibilidad se confirma de nuevo antes de una futura compra.</p>
              </div>
            </div>

            <button
              type="button"
              disabled={!isAvailable}
              onClick={() => {
                const query = new URLSearchParams({
                  product_key: tapixxoNfcProduct.slug,
                  model_key: selectedModel.id,
                  quantity: String(quantity),
                });
                router.push(`/store/checkout?${query}`);
              }}
              className="mt-7 w-full rounded-xl bg-orange-400 px-6 py-4 text-sm font-semibold text-black transition hover:bg-orange-300 hover:shadow-[0_0_28px_rgba(255,122,26,0.25)] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-gray-500 disabled:shadow-none"
            >
              {isAvailable ? "Continuar al checkout" : "Agotado"}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}

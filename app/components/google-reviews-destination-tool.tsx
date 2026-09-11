"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type CompanyCode = {
  id: string;
  code: string;
  active: boolean;
  destination_url: string | null;
};

type GooglePlace = {
  placeId: string;
  businessName: string;
  formattedAddress: string | null;
  selectionToken: string;
};

type ConnectedDestination = {
  google_place_id: string;
  business_name: string;
  formatted_address: string | null;
  review_url: string;
  updated_at: string;
};

type GoogleReviewsDestinationToolProps = {
  companyId: string;
  codes: CompanyCode[];
  onCodesUpdated: () => void;
  onOpenChange?: (open: boolean) => void;
};

const codeNumberOrder = new Intl.Collator("es", {
  numeric: true,
  sensitivity: "base",
});

function GooglePlaceSummary({ place }: { place: GooglePlace }) {
  return (
    <>
      <p className="font-semibold text-white">{place.businessName}</p>
      {place.formattedAddress && (
        <p className="mt-1 text-sm text-gray-400">{place.formattedAddress}</p>
      )}
    </>
  );
}

function GoogleMark() {
  return (
    <Image
      src="/brand/google-reviews-logo.webp"
      alt=""
      aria-hidden="true"
      width={28}
      height={28}
      className="h-7 w-7 shrink-0 object-contain"
    />
  );
}

export function GoogleReviewsDestinationTool({
  companyId,
  codes,
  onCodesUpdated,
  onOpenChange,
}: GoogleReviewsDestinationToolProps) {
  const searchCache = useRef(new Map<string, GooglePlace[]>());
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GooglePlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<GooglePlace | null>(null);
  const [confirmedPlace, setConfirmedPlace] = useState<GooglePlace | null>(null);
  const [selectedCodeIds, setSelectedCodeIds] = useState<Set<string>>(new Set());
  const [connectedDestination, setConnectedDestination] =
    useState<ConnectedDestination | null>(null);
  const [loadingConnection, setLoadingConnection] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const orderedCodes = useMemo(
    () => [...codes].sort((firstCode, secondCode) =>
      codeNumberOrder.compare(firstCode.code, secondCode.code)
    ),
    [codes]
  );

  useEffect(() => {
    let active = true;

    async function loadConnection() {
      try {
        const response = await fetch(
          `/api/companies/${companyId}/google-reviews`,
          { cache: "no-store" }
        );
        const result = await response.json();

        if (!response.ok) {
          if (active) setError(result.error ?? "No se pudo cargar Google Reviews.");
          return;
        }

        if (!active || !result.destination) return;

        const destination = result.destination as ConnectedDestination;
        setConnectedDestination(destination);
        setSelectedCodeIds(
          new Set(
            codes
              .filter(
                (code) => code.destination_url === destination.review_url
              )
              .map((code) => code.id)
          )
        );
      } catch {
        if (active) setError("No se pudo conectar con el servidor.");
      } finally {
        if (active) setLoadingConnection(false);
      }
    }

    void loadConnection();

    return () => {
      active = false;
    };
    // The connection is loaded once. The parent refreshes codes after a save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      return;
    }

    const searchKey = normalizedQuery
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("es-CO");
    const cachedResults = searchCache.current.get(searchKey);
    if (cachedResults) {
      setResults(cachedResults);
      setSearched(true);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      setError("");

      try {
        const response = await fetch(
          `/api/companies/${companyId}/google-reviews/search`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: normalizedQuery }),
            signal: controller.signal,
          }
        );
        const result = await response.json();

        if (!response.ok) {
          setResults([]);
          setError(result.error ?? "No se pudo buscar el negocio.");
          return;
        }

        const places = Array.isArray(result.places) ? result.places : [];
        if (searchCache.current.size >= 20) {
          const oldestKey = searchCache.current.keys().next().value;
          if (oldestKey) searchCache.current.delete(oldestKey);
        }
        searchCache.current.set(searchKey, places);
        setResults(places);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }
        setResults([]);
        setError("No se pudo conectar con el buscador de Google.");
      } finally {
        if (!controller.signal.aborted) {
          setSearched(true);
          setSearching(false);
        }
      }
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [companyId, query]);

  function toggleCode(codeId: string) {
    setSelectedCodeIds((current) => {
      const next = new Set(current);
      if (next.has(codeId)) {
        next.delete(codeId);
      } else {
        next.add(codeId);
      }
      return next;
    });
  }

  function toggleAllCodes() {
    setSelectedCodeIds((current) =>
      current.size === orderedCodes.length
        ? new Set()
        : new Set(orderedCodes.map((code) => code.id))
    );
  }

  async function confirmSelectedBusiness() {
    if (!selectedPlace) return;

    setConfirming(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/companies/${companyId}/google-reviews`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectionToken: selectedPlace.selectionToken,
            codeIds: [],
          }),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "No se pudo confirmar el negocio.");
        return;
      }

      setConfirmedPlace(selectedPlace);
      setConnectedDestination({
        google_place_id: result.destination.placeId,
        business_name: result.destination.businessName,
        formatted_address: result.destination.formattedAddress,
        review_url: "",
        updated_at: new Date().toISOString(),
      });
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setConfirming(false);
    }
  }

  async function saveGoogleReviews() {
    if (!confirmedPlace || selectedCodeIds.size === 0) {
      setError("Confirma tu negocio y selecciona al menos una placa.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/companies/${companyId}/google-reviews`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectionToken: confirmedPlace.selectionToken,
            codeIds: [...selectedCodeIds],
          }),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "No se pudo vincular Google Reviews.");
        return;
      }

      setConnectedDestination({
        google_place_id: result.destination.placeId,
        business_name: result.destination.businessName,
        formatted_address: result.destination.formattedAddress,
        review_url: "",
        updated_at: new Date().toISOString(),
      });
      setSuccess(
        `Google Reviews conectado a ${result.updatedCodes} placa${result.updatedCodes === 1 ? "" : "s"}.`
      );
      onCodesUpdated();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  const allCodesSelected =
    orderedCodes.length > 0 && selectedCodeIds.size === orderedCodes.length;

  return (
    <section className="tapixxo-panel tapixxo-enter tapixxo-enter-delay-1 h-full min-w-0 overflow-hidden rounded-2xl sm:rounded-3xl">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="google-reviews-menu"
        onClick={() => setIsOpen((open) => {
          const nextOpen = !open;
          onOpenChange?.(nextOpen);
          return nextOpen;
        })}
        className="group flex min-h-24 w-full items-center gap-3 px-4 py-4 text-left transition duration-300 hover:bg-white/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-300/70 sm:min-h-28 sm:gap-4 sm:px-6"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.1] shadow-[inset_0_1px_1px_rgba(255,255,255,0.23),0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur-xl transition duration-300 group-hover:border-white/25 group-hover:bg-white/[0.15]">
          <GoogleMark />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-orange-300">
              Destino inteligente
            </span>
            {connectedDestination && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.85)]" />
                Conectado
              </span>
            )}
          </span>
          <span className="mt-1 block truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
            Google Reviews
          </span>
          <span className="mt-1 block truncate text-sm text-gray-400">
            {connectedDestination
              ? connectedDestination.business_name
              : "Conecta tus placas para conseguir más reseñas."}
          </span>
        </span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/15 text-gray-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition duration-300 group-hover:border-orange-300/35 group-hover:bg-orange-300/[0.1] group-hover:text-orange-100">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className={`h-5 w-5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      <div
        id="google-reviews-menu"
        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-white/[0.08] px-4 pb-5 pt-5 sm:px-6 sm:pb-6">
      {loadingConnection ? (
        <div className="mt-5 h-20 animate-pulse rounded-2xl border border-white/[0.07] bg-white/[0.035]" />
      ) : connectedDestination && !confirmedPlace ? (
        <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-100">
              ✓ Google Reviews conectado
            </p>
            <p className="mt-1 text-sm text-gray-300">
              {connectedDestination.business_name}
              {connectedDestination.formatted_address
                ? ` · ${connectedDestination.formatted_address}`
                : ""}
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Tus clientes ya pueden tocar o escanear sus placas para dejar una reseña.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setConnectedDestination(null);
              setQuery("");
              setResults([]);
              setError("");
              setSuccess("");
            }}
            className="min-h-11 shrink-0 rounded-xl border border-emerald-300/30 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-200/60 hover:bg-emerald-300/10"
          >
            Cambiar negocio
          </button>
        </div>
      ) : (
        <div className="mt-6">
          {!confirmedPlace ? (
            <>
              <label className="mb-2 block text-sm font-medium text-gray-200" htmlFor="google-business-search">
                Busca tu negocio
              </label>
              <div className="relative">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500"
                >
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 4 4" />
                </svg>
                <input
                  id="google-business-search"
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSelectedPlace(null);
                    setResults([]);
                    setSearched(false);
                    setSearching(false);
                    setSuccess("");
                  }}
                  placeholder="Ej. Tapixxo Resto Bar Cartagena"
                  autoComplete="off"
                  className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-12 pr-4 text-white outline-none transition placeholder:text-gray-600 focus:border-orange-400/60 focus:bg-black/40"
                />
              </div>
              <p
                className="mt-2 whitespace-nowrap font-sans text-xs font-normal tracking-normal text-[#bdbdbd]"
                translate="no"
              >
                Google Maps
              </p>

              {searching && (
                <div className="mt-4 space-y-3" aria-label="Buscando negocios">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="animate-pulse rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
                      <div className="h-4 w-2/5 rounded bg-white/10" />
                      <div className="mt-3 h-3 w-3/4 rounded bg-white/[0.07]" />
                    </div>
                  ))}
                </div>
              )}

              {!searching && searched && results.length === 0 && !error && (
                <div className="mt-4 rounded-2xl border border-dashed border-white/15 bg-black/15 p-5 text-center text-sm text-gray-400">
                  No encontramos negocios. Prueba con el nombre, la ciudad o la dirección.
                </div>
              )}

              {!searching && results.length > 0 && (
                <div className="mt-4 space-y-3">
                  {results.map((place) => {
                    const isSelected = selectedPlace?.placeId === place.placeId;
                    return (
                      <button
                        key={place.placeId}
                        type="button"
                        onClick={() => {
                          setSelectedPlace(place);
                          setError("");
                        }}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          isSelected
                            ? "border-orange-300/60 bg-orange-400/[0.1] shadow-[0_12px_30px_rgba(249,115,22,0.12)]"
                            : "border-white/[0.08] bg-black/25 hover:border-orange-400/35 hover:bg-orange-400/[0.04]"
                        }`}
                      >
                        <GooglePlaceSummary place={place} />
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedPlace && (
                <div className="mt-5 rounded-2xl border border-orange-300/35 bg-gradient-to-br from-orange-300/[0.14] via-white/[0.055] to-black/20 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
                  <p className="text-sm font-semibold text-orange-100">✓ Negocio encontrado</p>
                  <div className="mt-3">
                    <GooglePlaceSummary place={selectedPlace} />
                  </div>
                  <button
                    type="button"
                    onClick={() => void confirmSelectedBusiness()}
                    disabled={confirming}
                    className="mt-5 min-h-12 rounded-xl bg-orange-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-300 hover:shadow-[0_0_24px_rgba(249,115,22,0.24)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {confirming ? "Confirmando..." : "Este es mi negocio"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-emerald-300/25 bg-emerald-400/[0.06] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-100">✓ Negocio confirmado</p>
                  <div className="mt-2"><GooglePlaceSummary place={confirmedPlace} /></div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmedPlace(null);
                    setSelectedPlace(null);
                  }}
                  className="min-h-10 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-gray-200 transition hover:bg-white/[0.06]"
                >
                  Elegir otro
                </button>
              </div>

              <div className="mt-6 border-t border-white/[0.08] pt-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-white">¿Qué placas quieres vincular?</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      Puedes seleccionar una, varias o todas tus placas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleAllCodes}
                    disabled={orderedCodes.length === 0}
                    className="min-h-11 rounded-xl border border-orange-300/30 px-4 py-2 text-sm font-semibold text-orange-100 transition hover:border-orange-300/60 hover:bg-orange-300/10 disabled:opacity-50"
                  >
                    {allCodesSelected ? "Quitar todas" : "Seleccionar todas"}
                  </button>
                </div>

                {orderedCodes.length === 0 ? (
                  <p className="mt-4 rounded-xl border border-dashed border-white/15 bg-black/15 p-4 text-sm text-gray-400">
                    Esta empresa todavía no tiene placas para vincular.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {orderedCodes.map((code) => {
                      const checked = selectedCodeIds.has(code.id);
                      return (
                        <label
                          key={code.id}
                          className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                            checked
                              ? "border-orange-300/55 bg-orange-400/[0.1] text-white"
                              : "border-white/[0.08] bg-black/25 text-gray-300 hover:border-white/20"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCode(code.id)}
                            className="h-4 w-4 accent-orange-400"
                          />
                          <span className="font-mono font-semibold">{code.code}</span>
                          {!code.active && <span className="ml-auto text-xs text-gray-500">Inactiva</span>}
                        </label>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void saveGoogleReviews()}
                  disabled={saving || selectedCodeIds.size === 0 || orderedCodes.length === 0}
                  className="mt-5 min-h-12 w-full rounded-xl bg-orange-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-300 hover:shadow-[0_0_24px_rgba(249,115,22,0.24)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {saving ? "Vinculando..." : "Vincular a mis placas"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-5 rounded-xl border border-red-400/25 bg-red-950/40 px-4 py-3 text-sm text-red-200" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-5 rounded-xl border border-emerald-300/25 bg-emerald-400/[0.08] px-4 py-3 text-sm text-emerald-100" role="status">
          ✓ Google Reviews conectado. Tus clientes ya pueden tocar o escanear sus placas para dejar una reseña.
        </p>
      )}
          </div>
        </div>
      </div>
    </section>
  );
}

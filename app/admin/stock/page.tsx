"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@/app/components/sign-out-button";
import { TapixxoMark } from "@/app/components/tapixxo-brand";
import { createClient } from "@/lib/supabase/client";

type SimpleCode = { id: string; code: string };
type ProcessingCode = SimpleCode & { processing_at: string | null };
type SoldCode = SimpleCode & { company: string; group: string; assigned_at: string | null };
type ReviewCode = SimpleCode & { reason: string };
type StockData = {
  summary: { available: number; on_sale: number; processing: number; sold: number; review: number };
  available: SimpleCode[];
  on_sale: SimpleCode[];
  processing: ProcessingCode[];
  sold: SoldCode[];
  review: ReviewCode[];
};

const EMPTY_STOCK: StockData = {
  summary: { available: 0, on_sale: 0, processing: 0, sold: 0, review: 0 },
  available: [], on_sale: [], processing: [], sold: [], review: [],
};

function matches(code: string, search: string) {
  return code.toUpperCase().includes(search.trim().toUpperCase());
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
}

export default function AdminStockPage() {
  const router = useRouter();
  const supabase = createClient();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loading, setLoading] = useState(true);
  const [changingId, setChangingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [stock, setStock] = useState<StockData>(EMPTY_STOCK);

  async function loadStock() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/stock", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "No se pudo cargar el stock.");
        return;
      }
      setStock(result);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") {
        router.replace("/dashboard");
        return;
      }
      if (!mounted) return;
      setCheckingAccess(false);
      await loadStock();
    }
    init();
    return () => { mounted = false; };
    // The client session is intentionally checked once when this admin page mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function changeSale(codeId: string, action: "offer" | "withdraw") {
    setChangingId(codeId);
    setError("");
    try {
      const response = await fetch(`/api/admin/stock/${codeId}/${action}`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "No se pudo actualizar el stock.");
        return;
      }
      await loadStock();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setChangingId(null);
    }
  }

  const filtered = useMemo(() => ({
    available: stock.available.filter((item) => matches(item.code, search)),
    on_sale: stock.on_sale.filter((item) => matches(item.code, search)),
    processing: stock.processing.filter((item) => matches(item.code, search)),
    sold: stock.sold.filter((item) => matches(item.code, search)),
    review: stock.review.filter((item) => matches(item.code, search)),
  }), [search, stock]);

  if (checkingAccess) return <main className="tapixxo-shell flex min-h-screen items-center justify-center text-sm text-gray-400">Verificando acceso...</main>;

  return (
    <main className="tapixxo-shell tapixxo-grid min-h-screen text-white">
      <header className="border-b border-white/[0.08] bg-black/20 px-5 py-5 backdrop-blur-sm md:px-8">
        <div className="mx-auto flex max-w-7xl items-end justify-between gap-4">
          <div className="flex items-center gap-3"><TapixxoMark /><div><p className="text-xs font-medium uppercase tracking-[.18em] text-orange-300">Tapixxo / Administración</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Stock de placas</h1><p className="mt-1 text-sm text-gray-500">Las placas físicas siguen el estado del código, sin modificar sus destinos.</p></div></div>
          <div className="flex gap-2"><Link href="/admin/codes" className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-sm hover:border-orange-400/40">Códigos</Link><Link href="/companies" className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-sm hover:border-orange-400/40">Empresas</Link><SignOutButton /></div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl space-y-5 p-5 md:p-8">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[["Disponibles", stock.summary.available, "text-white"], ["En venta", stock.summary.on_sale, "text-emerald-300"], ["En proceso", stock.summary.processing, "text-amber-200"], ["Vendidas", stock.summary.sold, "text-sky-300"], ["Para revisar", stock.summary.review, "text-red-300"]].map(([label, value, tone]) => <div key={String(label)} className="tapixxo-panel rounded-2xl p-5"><p className="text-sm text-gray-500">{label}</p><p className={`mt-2 text-3xl font-semibold ${tone}`}>{value}</p></div>)}
        </section>
        <section className="tapixxo-panel rounded-2xl p-5 sm:p-6"><label className="text-sm text-gray-300">Buscar código<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="M1051" className="ml-0 mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-white outline-none focus:border-orange-400/60 md:ml-3 md:mt-0 md:w-64" /></label>{error && <p className="mt-4 rounded-xl border border-red-400/20 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</p>}</section>
        {loading ? <p className="text-sm text-gray-400">Cargando stock...</p> : <div className="grid gap-5 xl:grid-cols-2">
          <StockSection title="Disponibles" description="Códigos globales sin placa en venta. Puedes crear o reactivar su unidad física." items={filtered.available} empty="No hay códigos disponibles." action={(item) => <button onClick={() => changeSale(item.id, "offer")} disabled={changingId === item.id} className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-black disabled:opacity-50">{changingId === item.id ? "Actualizando..." : "Poner en venta"}</button>} />
          <StockSection title="En venta" description="Placas físicas disponibles para una futura Store." items={filtered.on_sale} empty="No hay placas en venta." action={(item) => <button onClick={() => changeSale(item.id, "withdraw")} disabled={changingId === item.id} className="rounded-lg border border-amber-400/40 px-3 py-2 text-xs font-semibold text-amber-100 disabled:opacity-50">{changingId === item.id ? "Actualizando..." : "Retirar de venta"}</button>} />
          <StockSection title="En proceso" description="Preparada para una venta futura; no permite acciones manuales." items={filtered.processing} empty="No hay placas en proceso." detail={(item) => `Desde ${formatDate((item as ProcessingCode).processing_at)}`} />
          <StockSection title="Vendidas" description="La asignación correcta requiere empresa y grupo de la misma empresa." items={filtered.sold} empty="No hay placas vendidas." detail={(item) => { const sold = item as SoldCode; return `${sold.company} · ${sold.group}${sold.assigned_at ? ` · ${formatDate(sold.assigned_at)}` : ""}`; }} />
          <StockSection title="Para revisar" description="Asignaciones incompletas o estados heredados. No se corrigen automáticamente." items={filtered.review} empty="No hay registros que revisar." detail={(item) => (item as ReviewCode).reason} />
        </div>}
      </div>
    </main>
  );
}

function StockSection({ title, description, items, empty, action, detail }: { title: string; description: string; items: SimpleCode[]; empty: string; action?: (item: SimpleCode) => React.ReactNode; detail?: (item: SimpleCode) => string; }) {
  return <section className="tapixxo-panel rounded-2xl p-5 sm:p-6"><h2 className="text-xl font-semibold">{title}</h2><p className="mt-1 text-sm text-gray-500">{description}</p>{items.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-white/10 bg-black/15 px-4 py-5 text-sm text-gray-500">{empty}</p> : <div className="mt-5 space-y-2">{items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/[.08] bg-black/20 px-4 py-3"><div><p className="font-mono font-medium text-orange-100">{item.code}</p>{detail && <p className="mt-1 text-xs text-gray-400">{detail(item)}</p>}</div>{action?.(item)}</div>)}</div>}</section>;
}

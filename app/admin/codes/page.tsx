"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@/app/components/sign-out-button";
import { TapixxoMark } from "@/app/components/tapixxo-brand";
import { createClient } from "@/lib/supabase/client";

export default function AdminCodesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [prefix, setPrefix] = useState("M");
  const [start, setStart] = useState("1051");
  const [end, setEnd] = useState("1060");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      setCheckingAccess(false);
    }

    checkAdmin();
    // The client session is intentionally checked once when this admin page mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createGlobalCodes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const normalizedPrefix = prefix.trim().toUpperCase();
    const first = Number.parseInt(start, 10);
    const last = Number.parseInt(end, 10);
    const total = last - first + 1;

    if (!/^[A-Z]+$/.test(normalizedPrefix) || first < 1 || last < first || total > 1000) {
      setError("Revisa el prefijo y el rango. El lote debe tener entre 1 y 1000 códigos.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codes: Array.from({ length: total }, (_, index) => ({
            code: `${normalizedPrefix}${first + index}`,
            group_id: null,
            destination_url: null,
            active: false,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "No se pudieron crear los códigos.");
        return;
      }
      setMessage(`${result.created ?? total} códigos globales creados. Ahora puedes ponerlos a la venta desde Stock.`);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  if (checkingAccess) {
    return <main className="tapixxo-shell flex min-h-screen items-center justify-center text-sm text-gray-400">Verificando acceso...</main>;
  }

  return (
    <main className="tapixxo-shell tapixxo-grid min-h-screen text-white">
      <header className="border-b border-white/[0.08] bg-black/20 px-5 py-5 backdrop-blur-sm md:px-8">
        <div className="mx-auto flex max-w-5xl items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <TapixxoMark />
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-300">Tapixxo / Administración</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Códigos globales</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/stock" className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm hover:border-orange-400/40">Stock</Link>
            <Link href="/companies" className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm hover:border-orange-400/40">Empresas</Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl p-5 md:p-8">
        <div className="tapixxo-panel rounded-2xl p-6">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-orange-300">Inventario futuro</p>
          <h2 className="mt-2 text-xl font-semibold">Crear un rango de códigos sin asignar</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">Los códigos se crean globales, inactivos y sin destino. No se crean placas físicas ni se publica nada en la Store hasta que los marques como «En venta» desde Stock.</p>
          <form onSubmit={createGlobalCodes} className="mt-6 grid gap-4 sm:grid-cols-3">
            <label className="text-sm text-gray-300">Prefijo<input value={prefix} onChange={(event) => setPrefix(event.target.value)} maxLength={8} disabled={saving} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono uppercase outline-none focus:border-orange-400/60" /></label>
            <label className="text-sm text-gray-300">Desde<input value={start} onChange={(event) => setStart(event.target.value)} inputMode="numeric" disabled={saving} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono outline-none focus:border-orange-400/60" /></label>
            <label className="text-sm text-gray-300">Hasta<input value={end} onChange={(event) => setEnd(event.target.value)} inputMode="numeric" disabled={saving} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono outline-none focus:border-orange-400/60" /></label>
            <div className="sm:col-span-3"><button disabled={saving} className="rounded-xl bg-orange-400 px-5 py-3 text-sm font-semibold text-black hover:bg-orange-300 disabled:opacity-50">{saving ? "Creando..." : "Crear códigos globales"}</button></div>
          </form>
          {error && <p className="mt-5 rounded-xl border border-red-400/20 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</p>}
          {message && <p className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">{message}</p>}
        </div>
      </section>
    </main>
  );
}

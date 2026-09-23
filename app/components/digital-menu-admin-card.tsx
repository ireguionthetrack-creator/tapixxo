"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Menu = { id: string; company_id: string | null; name: string; slug: string; status: string; updated_at: string };
type Data = { company: { id: string; name: string; menu_digital_enabled: boolean }; menus: Menu[] };

export function DigitalMenuAdminCard({ companyId }: { companyId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedMenuId, setSelectedMenuId] = useState("");
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/companies/${companyId}/digital-menu`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "No se pudo cargar Menú Digital."); return; }
    setData(result);
    const assigned = (result.menus as Menu[]).find((menu) => menu.company_id === companyId);
    setSelectedMenuId(assigned?.id ?? "");
  }, [companyId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function request(body: unknown, method = "POST") {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/digital-menu`, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo guardar el cambio.");
      await load();
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo guardar el cambio.");
      return false;
    } finally { setBusy(false); }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    if (await request({ action: "create", name: newName, slug: newSlug })) { setNewName(""); setNewSlug(""); }
  }

  if (!data && !error) return null;
  const assigned = data?.menus.find((menu) => menu.company_id === companyId) ?? null;
  const available = data?.menus.filter((menu) => !menu.company_id || menu.company_id === companyId) ?? [];

  return (
    <section className="tapixxo-panel mt-6 rounded-2xl p-5 sm:p-6" aria-labelledby="digital-menu-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-200">Módulo premium</p><h2 id="digital-menu-heading" className="mt-1 text-xl font-semibold text-white">Menú Digital</h2><p className="mt-1 text-sm text-gray-400">Control administrativo y asignación del menú de esta empresa.</p></div>
        <button type="button" disabled={busy || !data} onClick={() => void request({ enabled: !data?.company.menu_digital_enabled }, "PATCH")} className={`rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${data?.company.menu_digital_enabled ? "bg-emerald-400 text-emerald-950" : "border border-white/20 text-gray-100"}`}>
          {data?.company.menu_digital_enabled ? "Módulo activado" : "Activar módulo"}
        </button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
      {data && <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/15 p-4">
          <h3 className="font-medium text-white">Menú asignado</h3>
          <p className="mt-1 text-sm text-gray-400">{assigned ? `${assigned.name} · /${assigned.slug}` : "No hay menú asignado."}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <select value={selectedMenuId} onChange={(event) => setSelectedMenuId(event.target.value)} disabled={busy} className="min-w-48 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white">
              <option value="">Selecciona un menú disponible</option>
              {available.map((menu) => <option key={menu.id} value={menu.id}>{menu.name} · {menu.slug}</option>)}
            </select>
            <button type="button" disabled={busy || !selectedMenuId || selectedMenuId === assigned?.id} onClick={() => void request({ action: "assign", menuId: selectedMenuId })} className="rounded-lg bg-orange-400 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50">Asignar</button>
            {assigned && <button type="button" disabled={busy} onClick={() => void request({ action: "unassign", menuId: assigned.id })} className="rounded-lg border border-white/20 px-3 py-2 text-sm text-gray-200 disabled:opacity-50">Desasignar</button>}
          </div>
          <p className="mt-3 text-xs text-gray-500">Asignar conserva el contenido; si la empresa ya tenía otro menú, éste queda disponible para reasignar.</p>
        </div>
        <form onSubmit={create} className="rounded-xl border border-white/10 bg-black/15 p-4">
          <h3 className="font-medium text-white">Crear y asignar menú</h3>
          <div className="mt-3 grid gap-2"><input required value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Nombre interno" className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-gray-500" /><input required value={newSlug} onChange={(event) => setNewSlug(event.target.value.toLowerCase())} placeholder="slug-del-menu" pattern="[a-z0-9]+(-[a-z0-9]+)*" className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-gray-500" /><button disabled={busy} className="w-fit rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black disabled:opacity-50">Crear y asignar</button></div>
        </form>
      </div>}
    </section>
  );
}

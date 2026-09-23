"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, Cancel01Icon, Edit02Icon, Restaurant01Icon, Search01Icon, Tick02Icon } from "@hugeicons/core-free-icons";

type Assignment = { id: string; code_id: string; table_label: string; updated_at: string };
type Plate = { id: string; code: string; active: boolean; company_id: string | null; group_id: string | null; assignment: Assignment | null };

export function MenuTableAssignments({ companyId, open, onToggle }: { companyId: string; open: boolean; onToggle: () => void }) {
  const [plates, setPlates] = useState<Plate[] | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tableLabel, setTableLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/companies/${companyId}/digital-menu/tables`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "No se pudieron cargar las placas."); return; }
    setPlates(result.plates ?? []);
  }, [companyId]);

  useEffect(() => {
    if (!open || plates) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, open, plates]);

  const matchingPlates = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es-CO");
    return (plates ?? []).filter((plate) => !query || `${plate.code} ${plate.assignment?.table_label ?? ""}`.toLocaleLowerCase("es-CO").includes(query));
  }, [plates, search]);

  function beginEditing(plate: Plate) {
    setError(""); setNotice(""); setEditingId(plate.id); setTableLabel(plate.assignment?.table_label ?? "");
  }

  async function save(event: FormEvent, plate: Plate) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/companies/${companyId}/digital-menu/tables`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codeId: plate.id, tableLabel }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo guardar la mesa.");
      await load(); setEditingId(null); setNotice(`${plate.code} ahora se identifica como “${result.assignment.table_label}”.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo guardar la mesa."); }
    finally { setBusy(false); }
  }

  async function remove(plate: Plate) {
    if (!confirm(`¿Quitar la asignación de ${plate.assignment?.table_label ?? plate.code}?`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/companies/${companyId}/digital-menu/tables?codeId=${encodeURIComponent(plate.id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo quitar la asignación.");
      await load(); setNotice(`Se quitó la asignación de ${plate.code}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo quitar la asignación."); }
    finally { setBusy(false); }
  }

  return <section className="tapixxo-panel overflow-hidden rounded-2xl">
    <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left sm:p-5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-orange-300/20 bg-orange-300/10 text-orange-100"><HugeiconsIcon icon={Restaurant01Icon} size={21} aria-hidden="true" /></span>
      <span className="min-w-0 flex-1"><span className="block text-base font-semibold text-white">Mesas y placas</span><span className="mt-0.5 block truncate text-xs text-gray-400">Asigna el nombre que verá el mesero al pedir atención</span></span>
      {plates && <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-xs font-semibold tabular-nums text-orange-100">{plates.filter((plate) => plate.assignment).length}</span>}
      <HugeiconsIcon icon={ArrowDown01Icon} size={20} className={`shrink-0 text-gray-400 transition duration-300 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
    </button>
    <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}><div className="min-h-0 overflow-hidden"><div className="border-t border-white/10 p-4 sm:p-5">
      <p className="text-sm leading-6 text-gray-400">Vincula una placa física a una mesa, por ejemplo <strong className="font-semibold text-orange-100">T1001 → Mesa 1</strong>. Cuando un cliente pulse “Llamar al mesero”, la solicitud llegará con ese nombre.</p>
      <label className="relative mt-4 block"><span className="sr-only">Buscar placa o mesa</span><HugeiconsIcon icon={Search01Icon} size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-orange-100" aria-hidden="true" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar placa o mesa…" className="w-full rounded-xl border border-white/15 bg-black/30 py-2.5 pl-10 pr-10 text-sm text-white outline-none placeholder:text-gray-500 focus:border-orange-300/65 focus:ring-2 focus:ring-orange-300/15" />{search && <button type="button" onClick={() => setSearch("")} aria-label="Limpiar búsqueda" className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white"><HugeiconsIcon icon={Cancel01Icon} size={17} aria-hidden="true" /></button>}</label>
      {error && <p role="alert" className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p>}{notice && <p role="status" className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">{notice}</p>}
      {!plates ? <div className="mt-4 h-24 animate-pulse rounded-xl border border-white/10 bg-black/15" aria-busy="true" aria-label="Cargando placas" /> : <ul className="mt-4 space-y-2">{matchingPlates.map((plate) => <li key={plate.id} className="rounded-xl border border-white/10 bg-black/15 p-3"><div className="flex items-center gap-3"><span className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 font-mono text-sm font-bold text-white">{plate.code}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{plate.assignment?.table_label ?? "Sin mesa asignada"}</p><p className="mt-0.5 text-xs text-gray-400">{plate.active ? "Placa activa" : "Placa inactiva"}</p></div>{editingId !== plate.id && <button type="button" onClick={() => beginEditing(plate)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-orange-300/25 bg-orange-300/10 px-3 text-xs font-bold text-orange-100"><HugeiconsIcon icon={Edit02Icon} size={16} aria-hidden="true" />{plate.assignment ? "Editar" : "Asignar"}</button>}</div>{editingId === plate.id && <form onSubmit={(event) => void save(event, plate)} className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row"><label className="min-w-0 flex-1"><span className="sr-only">Nombre de la mesa</span><input autoFocus required maxLength={120} value={tableLabel} onChange={(event) => setTableLabel(event.target.value)} placeholder="Ej. Mesa 1" className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-500 focus:border-orange-300/65" /></label><div className="flex gap-2"><button disabled={busy} className="min-h-10 rounded-lg bg-orange-400 px-3 text-xs font-bold text-black disabled:opacity-50">{busy ? "Guardando…" : "Guardar"}</button><button type="button" disabled={busy} onClick={() => { setEditingId(null); setTableLabel(""); }} className="min-h-10 rounded-lg border border-white/15 px-3 text-xs font-semibold text-gray-200">Cancelar</button>{plate.assignment && <button type="button" disabled={busy} onClick={() => void remove(plate)} className="min-h-10 rounded-lg border border-red-300/25 px-3 text-xs font-semibold text-red-200">Quitar</button>}</div></form>}</li>)}{matchingPlates.length === 0 && <li className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-gray-400">{search ? "No encontramos placas o mesas con esa búsqueda." : "Esta empresa aún no tiene placas disponibles."}</li>}</ul>}
      {plates && plates.length > 0 && <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500"><HugeiconsIcon icon={Tick02Icon} size={14} aria-hidden="true" />La asignación solo cambia el nombre mostrado al mesero; no cambia el código ni su redirección.</p>}
    </div></div></div>
  </section>;
}

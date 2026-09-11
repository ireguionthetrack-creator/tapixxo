"use client";

import { useEffect, useMemo, useState } from "react";

type CompanyCode = {
  id: string;
  code: string;
  active: boolean;
  destination_url: string | null;
};

type ScheduleRule = {
  id?: string;
  start_time?: string;
  end_time?: string;
  destination_type?: "primary" | "google_reviews" | "whatsapp" | "custom";
  destination_url?: string;
};

type LoadedSchedule = {
  id: string;
  enabled: boolean;
  schedule_kind: "daily" | "date";
  schedule_date: string | null;
  after_behavior: "keep_last" | "default_destination" | "custom_destination";
  after_custom_destination_url: string | null;
  code_schedule_rules: ScheduleRule[];
};

type RuleForm = {
  startTime: string;
  endTime: string;
  destinationType: "primary" | "google_reviews" | "whatsapp" | "custom";
  destinationUrl: string;
};

const codeNumberOrder = new Intl.Collator("es", { numeric: true, sensitivity: "base" });
const commonTimeZones = [
  "America/Bogota",
  "America/Mexico_City",
  "America/Lima",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
  "UTC",
];

const initialRule = (): RuleForm => ({
  startTime: "09:00",
  endTime: "18:00",
  destinationType: "primary",
  destinationUrl: "",
});

function getLocalClock(timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    return { date: `${value("year")}-${value("month")}-${value("day")}`, time: `${value("hour")}:${value("minute")}` };
  } catch {
    return null;
  }
}

function ruleIsActive(rule: RuleForm, currentTime: string) {
  return rule.startTime < rule.endTime
    ? currentTime >= rule.startTime && currentTime < rule.endTime
    : currentTime >= rule.startTime || currentTime < rule.endTime;
}

export function CodeScheduleDestinationTool({
  companyId,
  codes,
  selectedCodeId,
  onScheduleChanged,
  onOpenChange,
}: {
  companyId: string;
  codes: CompanyCode[];
  selectedCodeId?: string | null;
  onScheduleChanged?: () => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const orderedCodes = useMemo(
    () => [...codes].sort((a, b) => codeNumberOrder.compare(a.code, b.code)),
    [codes]
  );
  const [open, setOpen] = useState(false);
  const [codeId, setCodeId] = useState("");
  const [selectedCodeIds, setSelectedCodeIds] = useState<Set<string>>(new Set());
  const [platesExpanded, setPlatesExpanded] = useState(false);
  const [applyToFuturePlates, setApplyToFuturePlates] = useState(false);
  const [replaceConflicts, setReplaceConflicts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [kind, setKind] = useState<"daily" | "date">("daily");
  const [date, setDate] = useState("");
  const [timeZone, setTimeZone] = useState("America/Bogota");
  const [after, setAfter] = useState<"keep_last" | "default_destination" | "custom_destination">("default_destination");
  const [rules, setRules] = useState<RuleForm[]>([initialRule()]);
  const [sharedScheduleId, setSharedScheduleId] = useState<string | null>(null);
  const [canDetach, setCanDetach] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [primaryDestinationUrl, setPrimaryDestinationUrl] = useState<string | null>(null);
  const [googleReviewUrl, setGoogleReviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCodeId) return;
    const openTimer = window.setTimeout(() => {
      setCodeId(selectedCodeId);
      setSelectedCodeIds(new Set([selectedCodeId]));
      setOpen(true);
      onOpenChange?.(true);
    }, 0);
    return () => window.clearTimeout(openTimer);
  }, [onOpenChange, selectedCodeId]);

  const preview = useMemo(() => {
    const clock = getLocalClock(timeZone);
    if (!clock) return "Vista previa no disponible para esta zona horaria.";
    if (kind === "date" && date && date !== clock.date) {
      return `Ahora (${clock.date} ${clock.time}), fuera de la fecha programada: destino principal.`;
    }
    const activeRule = rules.find((rule) => ruleIsActive(rule, clock.time));
    if (activeRule) {
      const label = activeRule.destinationType === "primary" ? "destino principal" : activeRule.destinationType === "google_reviews" ? "Google Reviews" : activeRule.destinationUrl || "URL personalizada";
      return `Ahora (${clock.time}, ${timeZone}): ${label}.`;
    }
    const pastRules = rules.filter((rule) => rule.startTime < rule.endTime && rule.endTime <= clock.time)
      .sort((a, b) => b.endTime.localeCompare(a.endTime));
    if (after === "custom_destination") return `Ahora (${clock.time}, ${timeZone}): URL personalizada posterior.`;
    if (after === "keep_last" && pastRules[0]) return `Ahora (${clock.time}, ${timeZone}): mantiene ${pastRules[0].destinationType === "google_reviews" ? "Google Reviews" : pastRules[0].destinationType === "primary" ? "el destino principal" : "el último destino"}.`;
    return `Ahora (${clock.time}, ${timeZone}): destino principal.`;
  }, [after, date, kind, rules, timeZone]);

  useEffect(() => {
    if (!codeId || !open) return;
    let active = true;
    const loadTimer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      setSuccess("");
      fetch(`/api/companies/${companyId}/codes/${codeId}/schedule`, { cache: "no-store" })
      .then(async (response) => ({ response, result: await response.json() }))
      .then(({ response, result }) => {
        if (!active) return;
        if (!response.ok) {
          setError(result.error ?? "No se pudo cargar la programación.");
          return;
        }
        const schedule = result.schedule as LoadedSchedule | null;
        setSharedScheduleId(schedule?.id ?? null);
        setCanDetach(Boolean(schedule));
        setPrimaryDestinationUrl(result.primaryDestinationUrl ?? null);
        setGoogleReviewUrl(result.googleReviewUrl ?? null);
        setTimeZone(result.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC");
        if (!schedule) {
          setEnabled(true);
          setKind("daily");
          setDate("");
          setAfter("default_destination");
          setRules([initialRule()]);
          return;
        }
        setEnabled(schedule.enabled);
        setKind(schedule.schedule_kind);
        setDate(schedule.schedule_date ?? "");
        setAfter("default_destination");
        setRules(
          [...(schedule.code_schedule_rules ?? [])]
            .sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""))
            .map((rule) => ({
              startTime: (rule.start_time ?? "09:00").slice(0, 5),
              endTime: (rule.end_time ?? "18:00").slice(0, 5),
              destinationType: rule.destination_type ?? "custom",
              destinationUrl: rule.destination_url ?? "",
            }))
        );
      })
      .catch(() => active && setError("No se pudo conectar con el servidor."))
        .finally(() => active && setLoading(false));
    }, 0);
    return () => { active = false; window.clearTimeout(loadTimer); };
  }, [codeId, companyId, open]);

  function updateRule(index: number, update: Partial<RuleForm>) {
    setRules((current) => current.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, ...update } : rule));
  }

  function toggleCodeSelection(nextCodeId: string) {
    setSelectedCodeIds((current) => {
      const next = new Set(current);
      if (next.has(nextCodeId)) next.delete(nextCodeId);
      else next.add(nextCodeId);
      return next;
    });
  }

  async function save() {
    if (!codeId) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/companies/${companyId}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId: sharedScheduleId,
          name: null,
          enabled,
          scheduleKind: kind,
          scheduleDate: kind === "date" ? date : null,
          afterBehavior: "default_destination",
          afterCustomDestinationUrl: null,
          timeZone, applyToFuturePlates, replaceConflicts,
          codeIds: [...selectedCodeIds],
          rules,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "No se pudo guardar la programación.");
        return;
      }
      setSharedScheduleId(typeof result.schedule_id === "string" ? result.schedule_id : sharedScheduleId);
      setCanDetach(true);
      setSuccess(`Horario aplicado a ${selectedCodeIds.size} placa${selectedCodeIds.size === 1 ? "" : "s"}.`);
      onScheduleChanged?.();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  async function detachCurrentCode() {
    if (!codeId) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/companies/${companyId}/codes/${codeId}/schedule`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "No se pudo quitar la programación."); return; }
      setCanDetach(false);
      setSharedScheduleId(null);
      setSuccess("La placa fue quitada de esta programación. Las demás placas no cambiaron.");
      onScheduleChanged?.();
    } catch { setError("No se pudo conectar con el servidor."); }
    finally { setDeleting(false); }
  }

  return (
    <section className="tapixxo-panel tapixxo-enter tapixxo-enter-delay-2 h-full min-w-0 overflow-hidden rounded-2xl border border-white/[0.12] shadow-[0_24px_70px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.2)] sm:rounded-3xl">
      <button type="button" onClick={() => setOpen((value) => { const nextOpen = !value; onOpenChange?.(nextOpen); return nextOpen; })} aria-expanded={open}
        className="group flex min-h-24 w-full items-center gap-3 px-4 py-4 text-left transition duration-500 hover:bg-white/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-300/70 sm:min-h-28 sm:gap-4 sm:px-6">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-200/25 bg-gradient-to-br from-orange-200/[0.23] via-orange-400/[0.13] to-white/[0.05] text-orange-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.32),0_12px_26px_rgba(0,0,0,0.2)] backdrop-blur-xl transition duration-500 group-hover:scale-105 group-hover:border-orange-200/50 group-hover:shadow-[0_14px_32px_rgba(249,115,22,0.18)]">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><circle cx="12" cy="12" r="7.5"/><path d="M12 8v4.5l3 1.8"/><path d="M5 3.8 3.5 5.3M19 3.8l1.5 1.5"/></svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-orange-300">Destino inteligente</span>
          <span className="mt-1 block text-lg font-semibold tracking-tight text-white sm:text-xl">Destinos por horario</span>
          <span className="mt-1 block text-sm text-gray-400">Cambia el destino de cada placa según la hora.</span>
        </span>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.06] text-orange-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition duration-500 group-hover:border-orange-300/40 group-hover:bg-orange-300/[0.1] ${open ? "rotate-180" : ""}`}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="m6 9 6 6 6-6"/></svg></span>
      </button>
      <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
        <div className="border-t border-white/[0.08] bg-gradient-to-b from-white/[0.035] to-transparent px-4 pb-6 pt-5 sm:px-6 sm:pb-8">
          <label className="block text-sm font-medium text-gray-200">Placa de referencia
            <select value={codeId} onChange={(event) => { setCodeId(event.target.value); setSelectedCodeIds(event.target.value ? new Set([event.target.value]) : new Set()); }} className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-white outline-none focus:border-orange-400/60">
              <option value="">Selecciona una placa</option>
              {orderedCodes.map((code) => <option key={code.id} value={code.id}>{code.code}{code.active ? "" : " (inactiva)"}</option>)}
            </select>
          </label>
          {!codeId ? <p className="mt-4 rounded-2xl border border-dashed border-white/[0.15] bg-black/15 p-4 text-sm text-gray-400">Elige una placa para crear una programación reutilizable.</p> : loading ? <div className="mt-5 h-28 animate-pulse rounded-2xl border border-white/[0.07] bg-white/[0.04]" /> : (
            <div className="mt-5 space-y-5">
              <label className="flex min-h-11 items-center gap-3 rounded-xl border border-white/[0.1] bg-black/20 px-4 text-sm text-gray-200"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="h-4 w-4 accent-orange-400" /> Activar programación</label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm text-gray-300">Repetición<select value={kind} onChange={(event) => setKind(event.target.value as "daily" | "date")} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-white"><option value="daily">Todos los días</option><option value="date">Solo una fecha</option></select></label>
                {kind === "date" && <label className="text-sm text-gray-300">Fecha<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-white" /></label>}
                <label className="text-sm text-gray-300">Zona horaria<select value={timeZone} onChange={(event) => setTimeZone(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-white">{[...new Set([timeZone, ...commonTimeZones])].map((zone) => <option key={zone}>{zone}</option>)}</select></label>
              </div>
              <div><p className="text-sm font-semibold text-white">Franjas horarias</p><p className="mt-1 text-xs text-gray-400">Se admiten horarios que cruzan medianoche. Las franjas no pueden solaparse.</p>
                <div className="mt-3 space-y-3">{rules.map((rule, index) => <div key={index} className="rounded-xl border border-white/[0.1] bg-black/20 p-3"><div className="grid gap-3 sm:grid-cols-4"><input aria-label="Hora inicial" type="time" value={rule.startTime} onChange={(event) => updateRule(index, { startTime: event.target.value })} className="min-h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-white" /><input aria-label="Hora final" type="time" value={rule.endTime} onChange={(event) => updateRule(index, { endTime: event.target.value })} className="min-h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-white" /><select value={rule.destinationType} onChange={(event) => updateRule(index, { destinationType: event.target.value as RuleForm["destinationType"] })} className="min-h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-white"><option value="primary">Destino principal</option><option value="google_reviews" disabled={!googleReviewUrl}>Google Reviews</option><option value="whatsapp">WhatsApp</option><option value="custom">URL personalizada</option></select>{rule.destinationType === "whatsapp" || rule.destinationType === "custom" ? <input type="url" placeholder="https://…" value={rule.destinationUrl} onChange={(event) => updateRule(index, { destinationUrl: event.target.value })} className="min-h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-white" /> : <p className="self-center text-xs text-gray-500">{rule.destinationType === "primary" ? (primaryDestinationUrl ? "Usa el destino actual" : "Configura primero el destino") : "Usa Google Reviews conectado"}</p>}</div>{rules.length > 1 && <button type="button" onClick={() => setRules((current) => current.filter((_, ruleIndex) => ruleIndex !== index))} className="mt-3 text-xs text-red-300 hover:text-red-200">Quitar franja</button>}</div>)}</div>
                <button type="button" disabled={rules.length >= 24} onClick={() => setRules((current) => [...current, initialRule()])} className="mt-3 min-h-10 rounded-xl border border-orange-300/30 px-4 text-sm font-semibold text-orange-100 transition hover:bg-orange-300/10 disabled:opacity-50">Añadir franja</button>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/[0.12] bg-gradient-to-br from-white/[0.06] via-black/20 to-orange-400/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5"><div><p className="font-semibold text-white">¿A qué placas quieres aplicarlo?</p><p className="mt-1 text-sm text-gray-400"><span className="font-medium text-orange-100">{selectedCodeIds.size}</span> placa{selectedCodeIds.size === 1 ? "" : "s"} seleccionada{selectedCodeIds.size === 1 ? "" : "s"}.</p></div><div className="flex w-full flex-wrap gap-2 sm:w-auto"><button type="button" onClick={() => setSelectedCodeIds(new Set(orderedCodes.map((code) => code.id)))} className="min-h-10 flex-1 rounded-xl border border-orange-300/30 bg-orange-400/[0.08] px-3 text-xs font-semibold text-orange-100 transition hover:bg-orange-400/[0.16] sm:flex-none">Seleccionar todas</button><button type="button" onClick={() => setSelectedCodeIds(new Set())} className="min-h-10 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-gray-300 transition hover:bg-white/[0.08] sm:flex-none">Quitar selección</button><button type="button" onClick={() => setPlatesExpanded((value) => !value)} aria-expanded={platesExpanded} className="min-h-10 w-full rounded-xl border border-white/[0.14] bg-white/[0.06] px-3 text-xs font-semibold text-white transition hover:border-orange-300/40 hover:bg-orange-400/[0.1] sm:w-auto">{platesExpanded ? "Ocultar placas" : `Ver placas (${orderedCodes.length})`}</button></div></div>
                <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${platesExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}><div className="overflow-hidden"><div className="border-t border-white/[0.08] bg-black/[0.12] p-3 sm:p-4"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{orderedCodes.map((code) => <label key={code.id} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-sm transition ${selectedCodeIds.has(code.id) ? "border-orange-300/45 bg-orange-400/[0.11] text-white" : "border-white/[0.08] bg-black/20 text-gray-300 hover:border-white/20 hover:bg-white/[0.04]"}`}><input type="checkbox" checked={selectedCodeIds.has(code.id)} onChange={() => toggleCodeSelection(code.id)} className="h-4 w-4 accent-orange-400" /><span className="font-mono font-semibold">{code.code}</span></label>)}</div></div></div></div>
                <div className="border-t border-white/[0.08] p-4"><label className="flex gap-3 text-sm text-gray-300"><input type="checkbox" checked={applyToFuturePlates} onChange={(event) => setApplyToFuturePlates(event.target.checked)} className="mt-0.5 h-4 w-4 accent-orange-400" />Aplicar también a placas futuras</label><label className="mt-3 flex gap-3 text-sm text-gray-300"><input type="checkbox" checked={replaceConflicts} onChange={(event) => setReplaceConflicts(event.target.checked)} className="mt-0.5 h-4 w-4 accent-orange-400" />Reemplazar programación de placas que ya tengan una</label></div>
              </div>
              <p className="rounded-xl border border-orange-300/15 bg-orange-400/[0.05] p-3 text-xs leading-5 text-gray-300"><span className="font-semibold text-orange-100">Vista previa. </span>{preview}</p>
              {error && <p className="rounded-xl border border-red-400/25 bg-red-950/40 p-3 text-sm text-red-200" role="alert">{error}</p>}{success && <p className="rounded-xl border border-emerald-300/25 bg-emerald-400/[0.08] p-3 text-sm text-emerald-100">✓ {success}</p>}
              <div className="flex flex-wrap gap-3"><button type="button" disabled={saving || selectedCodeIds.size === 0} onClick={() => void save()} className="min-h-12 rounded-xl bg-orange-400 px-5 text-sm font-semibold text-black transition hover:bg-orange-300 disabled:opacity-50">{saving ? "Aplicando…" : sharedScheduleId ? "Guardar cambios compartidos" : selectedCodeIds.size === orderedCodes.length ? "Aplicar a todas las placas" : `Aplicar a ${selectedCodeIds.size} placa${selectedCodeIds.size === 1 ? "" : "s"}`}</button>{canDetach && <button type="button" disabled={deleting} onClick={() => void detachCurrentCode()} className="min-h-12 rounded-xl border border-red-400/30 px-5 text-sm font-semibold text-red-200 transition hover:bg-red-400/10 disabled:opacity-50">{deleting ? "Quitando…" : "Quitar de esta programación"}</button>}</div>
            </div>
          )}
        </div>
        </div>
      </div>
    </section>
  );
}

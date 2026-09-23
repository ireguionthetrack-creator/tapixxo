"use client";

export type LocalizedCopy = Record<"en" | "pt" | "fr", { name: string; description: string }>;
export type BannerLocalizedCopy = Record<"en" | "pt" | "fr", { eyebrow: string; title: string; description: string }>;

export const LANGUAGES = [
  ["en", "English"],
  ["pt", "Português"],
  ["fr", "Français"],
] as const;

const fieldClass = "mt-2 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2.5 text-sm text-white placeholder:text-gray-500";

export function emptyLocalizedCopy(): LocalizedCopy {
  return { en: { name: "", description: "" }, pt: { name: "", description: "" }, fr: { name: "", description: "" } };
}

export function emptyBannerLocalizedCopy(): BannerLocalizedCopy {
  return { en: { eyebrow: "", title: "", description: "" }, pt: { eyebrow: "", title: "", description: "" }, fr: { eyebrow: "", title: "", description: "" } };
}

export function localizedCopy(value: unknown): LocalizedCopy {
  const empty = emptyLocalizedCopy();
  if (!value || typeof value !== "object") return empty;
  return LANGUAGES.reduce((copy, [language]) => {
    const record = (value as Record<string, unknown>)[language];
    if (record && typeof record === "object") {
      const item = record as Record<string, unknown>;
      copy[language] = { name: typeof item.name === "string" ? item.name : "", description: typeof item.description === "string" ? item.description : "" };
    }
    return copy;
  }, empty);
}

export function bannerLocalizedCopy(value: unknown): BannerLocalizedCopy {
  const empty = emptyBannerLocalizedCopy();
  if (!value || typeof value !== "object") return empty;
  return LANGUAGES.reduce((copy, [language]) => {
    const record = (value as Record<string, unknown>)[language];
    if (record && typeof record === "object") {
      const item = record as Record<string, unknown>;
      copy[language] = { eyebrow: typeof item.eyebrow === "string" ? item.eyebrow : "", title: typeof item.title === "string" ? item.title : "", description: typeof item.description === "string" ? item.description : "" };
    }
    return copy;
  }, empty);
}

export function TranslationFields({ value, onChange }: { value: LocalizedCopy; onChange: (value: LocalizedCopy) => void }) {
  return <details className="rounded-xl border border-white/10 bg-black/10 p-3"><summary className="cursor-pointer text-sm font-medium text-orange-100">Traducciones del nombre y descripción</summary><div className="mt-3 grid gap-3">{LANGUAGES.map(([language, label]) => <fieldset key={language} className="rounded-lg border border-white/10 p-3"><legend className="px-1 text-xs font-semibold uppercase tracking-[.12em] text-orange-200">{label}</legend><label className="block text-xs text-gray-300">Nombre<input value={value[language].name} onChange={(event) => onChange({ ...value, [language]: { ...value[language], name: event.target.value } })} className={fieldClass} /></label><label className="mt-3 block text-xs text-gray-300">Descripción<textarea rows={2} value={value[language].description} onChange={(event) => onChange({ ...value, [language]: { ...value[language], description: event.target.value } })} className={fieldClass} /></label></fieldset>)}</div></details>;
}

export function BannerTranslationFields({ value, onChange }: { value: BannerLocalizedCopy; onChange: (value: BannerLocalizedCopy) => void }) {
  return <details className="rounded-xl border border-white/10 bg-black/10 p-3"><summary className="cursor-pointer text-sm font-medium text-orange-100">Traducciones del banner</summary><div className="mt-3 grid gap-3">{LANGUAGES.map(([language, label]) => <fieldset key={language} className="rounded-lg border border-white/10 p-3"><legend className="px-1 text-xs font-semibold uppercase tracking-[.12em] text-orange-200">{label}</legend><label className="block text-xs text-gray-300">Texto superior<input value={value[language].eyebrow} onChange={(event) => onChange({ ...value, [language]: { ...value[language], eyebrow: event.target.value } })} className={fieldClass} /></label><label className="mt-3 block text-xs text-gray-300">Título<input value={value[language].title} onChange={(event) => onChange({ ...value, [language]: { ...value[language], title: event.target.value } })} className={fieldClass} /></label><label className="mt-3 block text-xs text-gray-300">Descripción<textarea rows={2} value={value[language].description} onChange={(event) => onChange({ ...value, [language]: { ...value[language], description: event.target.value } })} className={fieldClass} /></label></fieldset>)}</div></details>;
}

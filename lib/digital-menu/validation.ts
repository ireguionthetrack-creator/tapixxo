import "server-only";

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const MENU_LANGUAGE_CODES = ["es", "en", "pt", "fr"] as const;
export type MenuLanguageCode = typeof MENU_LANGUAGE_CODES[number];

export function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

export function text(value: unknown, maxLength: number, field: string, required = false) {
  const result = typeof value === "string" ? value.trim() : "";
  if (required && !result) throw new Error(`${field} es obligatorio.`);
  if (result.length > maxLength) throw new Error(`${field} no puede superar ${maxLength} caracteres.`);
  return result || null;
}

export function menuSlug(value: unknown) {
  const slug = text(value, 80, "El slug", true)?.toLowerCase() ?? "";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("El slug solo puede usar minúsculas, números y guiones simples.");
  }
  return slug;
}

export function menuPrice(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(numberValue) || numberValue < 0 || numberValue > 9999999999.99) {
    throw new Error("El precio debe ser un número positivo válido.");
  }
  return Math.round(numberValue * 100) / 100;
}

export function imageUrl(value: unknown) {
  const url = text(value, 2048, "La imagen", false);
  if (!url) return null;
  if (/^\/menu-assets\/[A-Za-z0-9/_\-.]+$/.test(url) && !url.includes("..")) return url;
  try {
    const parsed = new URL(url);
    if (!["https:", "http:"].includes(parsed.protocol)) throw new Error();
  } catch {
    throw new Error("La imagen debe ser una URL http o https válida.");
  }
  return url;
}

export function menuLanguages(value: unknown): MenuLanguageCode[] {
  if (!Array.isArray(value)) throw new Error("Los idiomas no son válidos.");
  const languages = [...new Set(value.filter((language): language is MenuLanguageCode => typeof language === "string" && MENU_LANGUAGE_CODES.includes(language as MenuLanguageCode)))];
  if (!languages.includes("es")) throw new Error("El español debe permanecer activado.");
  return MENU_LANGUAGE_CODES.filter((language) => languages.includes(language));
}

function translatedText(value: unknown, nameLength: number, descriptionLength: number) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return MENU_LANGUAGE_CODES.filter((language) => language !== "es").reduce<Record<string, { name?: string; description?: string }>>((translations, language) => {
    const item = (value as Record<string, unknown>)[language];
    if (!item || typeof item !== "object" || Array.isArray(item)) return translations;
    const name = text((item as Record<string, unknown>).name, nameLength, `El nombre en ${language}`);
    const description = text((item as Record<string, unknown>).description, descriptionLength, `La descripción en ${language}`);
    if (name || description) translations[language] = { ...(name ? { name } : {}), ...(description ? { description } : {}) };
    return translations;
  }, {});
}

export function menuTranslations(value: unknown, nameLength: number, descriptionLength: number) {
  return translatedText(value, nameLength, descriptionLength);
}

export function sectionTranslations(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return MENU_LANGUAGE_CODES.filter((language) => language !== "es").reduce<Record<string, string>>((translations, language) => {
    const section = text((value as Record<string, unknown>)[language], 100, `La subcategoría en ${language}`);
    if (section) translations[language] = section;
    return translations;
  }, {});
}

export function bannerTranslations(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return MENU_LANGUAGE_CODES.filter((language) => language !== "es").reduce<Record<string, { eyebrow?: string; title?: string; description?: string }>>((translations, language) => {
    const item = (value as Record<string, unknown>)[language];
    if (!item || typeof item !== "object" || Array.isArray(item)) return translations;
    const record = item as Record<string, unknown>;
    const eyebrow = text(record.eyebrow, 120, `El texto superior en ${language}`);
    const title = text(record.title, 160, `El título en ${language}`);
    const description = text(record.description, 500, `La descripción en ${language}`);
    if (eyebrow || title || description) translations[language] = { ...(eyebrow ? { eyebrow } : {}), ...(title ? { title } : {}), ...(description ? { description } : {}) };
    return translations;
  }, {});
}

export function sortOrder(value: unknown) {
  const numberValue = Number(value ?? 0);
  if (!Number.isInteger(numberValue) || numberValue < 0 || numberValue > 100000) {
    throw new Error("El orden no es válido.");
  }
  return numberValue;
}

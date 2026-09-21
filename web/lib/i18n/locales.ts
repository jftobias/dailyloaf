export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "dailyloaf_locale";

/** Intl tag used for number/date formatting per locale. */
export const INTL_LOCALES: Record<Locale, string> = {
  en: "en-US",
  es: "es-CO",
};

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Picks the locale for a request: an explicit stored cookie wins, otherwise the
 * browser's preferred (highest-q) Accept-Language tag selects Spanish when its
 * base subtag is `es`; everything else falls back to English.
 */
export function pickLocale(acceptLanguage: string | null | undefined, cookieValue?: string | null): Locale {
  if (isLocale(cookieValue)) return cookieValue;

  const preferred = (acceptLanguage ?? "")
    .split(",")
    .map((entry) => {
      const [tag, ...params] = entry.trim().split(";");
      const q = params.map((param) => param.trim()).find((param) => param.startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number(q.slice(2)) : 1 };
    })
    .filter((entry) => entry.tag.length > 0)
    .sort((a, b) => b.q - a.q)[0];

  return preferred && preferred.tag.split("-")[0] === "es" ? "es" : "en";
}

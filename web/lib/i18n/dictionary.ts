import { messages as en } from "@/lib/i18n/messages/en";
import { messages as es } from "@/lib/i18n/messages/es";
import { DEFAULT_LOCALE, INTL_LOCALES, type Locale } from "@/lib/i18n/locales";

export type TFunction = (key: string, vars?: Record<string, string | number>) => string;

const dictionaries = { en, es } as const;

export function getMessages(locale: Locale) {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

/** Flattens nested messages to dot-separated keys, e.g. `nav.overview`. */
export function flattenMessages(tree: Record<string, unknown>, prefix = ""): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") flat[path] = value;
    else if (value && typeof value === "object") Object.assign(flat, flattenMessages(value as Record<string, unknown>, path));
  }
  return flat;
}

/** Returns every flattened key present in a dictionary — used by parity tests. */
export function messageKeys(tree: Record<string, unknown>) {
  return Object.keys(flattenMessages(tree)).sort();
}

/** Standalone translator — the same lookup the provider exposes via useT(). */
export function createTranslator(locale: Locale): TFunction {
  const flat = flattenMessages(getMessages(locale) as unknown as Record<string, unknown>);
  return (key, vars) => {
    const template = flat[key] ?? key;
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
  };
}

export function intlLocaleFor(locale: Locale) {
  return INTL_LOCALES[locale];
}

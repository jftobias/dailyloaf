"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createTranslator, intlLocaleFor, type TFunction } from "@/lib/i18n/dictionary";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "@/lib/i18n/locales";

export type { TFunction } from "@/lib/i18n/dictionary";

type I18nContextValue = {
  locale: Locale;
  intlLocale: string;
  t: TFunction;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function persistLocale(locale: Locale) {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax${secure}`;
}

export function LocaleProvider({ initialLocale, children }: Readonly<{ initialLocale: Locale; children: React.ReactNode }>) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? DEFAULT_LOCALE);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persistLocale(next);
  }, []);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    intlLocale: intlLocaleFor(locale),
    setLocale,
    t: createTranslator(locale),
  }), [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within LocaleProvider");
  return context;
}

export function useT() {
  return useI18n().t;
}

export function useLocale() {
  const { locale, intlLocale, setLocale } = useI18n();
  return { locale, intlLocale, setLocale };
}

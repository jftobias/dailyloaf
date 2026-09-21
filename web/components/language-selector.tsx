"use client";

import { useI18n } from "@/components/locale-provider";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/locales";

export function LanguageSelector({ className = "" }: Readonly<{ className?: string }>) {
  const { locale, setLocale, t } = useI18n();

  return (
    <select
      name="locale"
      aria-label={t("common.language")}
      value={locale}
      onChange={(event) => setLocale(event.target.value as Locale)}
      className={`rounded-lg border border-[#b9c9c0] bg-[#fffdf8] px-2 py-1.5 text-sm font-semibold text-[#0f4c4c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9ad5b] ${className}`.trim()}
    >
      {LOCALES.map((value) => (
        <option key={value} value={value}>{LOCALE_LABELS[value]}</option>
      ))}
    </select>
  );
}

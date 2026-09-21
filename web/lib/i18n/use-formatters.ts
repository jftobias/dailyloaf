"use client";

import { useMemo } from "react";
import { useI18n } from "@/components/locale-provider";
import { formatDate, formatDateTime, formatMoney } from "@/lib/financial-format";

/** Locale-bound formatters. Household currency/time zone are passed per call. */
export function useFormatters() {
  const { intlLocale } = useI18n();
  return useMemo(
    () => ({
      money: (value: string, currency: string) => formatMoney(value, currency, intlLocale),
      date: (value: string, timeZone?: string) => formatDate(value, intlLocale, timeZone),
      dateTime: (value: string, timeZone?: string) => formatDateTime(value, intlLocale, timeZone),
    }),
    [intlLocale],
  );
}

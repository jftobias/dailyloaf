"use client";

import { useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { controlClasses } from "@/components/ui/control-classes";
import { canonicalizeMoneyInput, formatMoneyEntry } from "@/lib/money-input";

type MoneyFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  currency: string;
  error?: string;
  hint?: string;
};

/**
 * Localized money input. Shows the household currency, accepts the active
 * locale's decimal/grouping separators, and groups digits on blur without
 * disturbing text while editing. Canonicalization to a decimal string for
 * the API happens via canonicalizeMoneyInput at submit time.
 */
export function MoneyField({ id, label, value, onChange, currency, error, hint }: MoneyFieldProps) {
  const { intlLocale } = useI18n();
  const [focused, setFocused] = useState(false);
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const currencyId = `${id}-currency`;
  const describedBy = [errorId, hintId, currencyId].filter(Boolean).join(" ");

  const canonical = canonicalizeMoneyInput(value, intlLocale);
  const display = focused || canonical === null ? value : formatMoneyEntry(canonical, intlLocale);

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-[#163c3b]">{label}</label>
      <div className="relative">
        <input
          id={id}
          value={display}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`${controlClasses} pr-16`}
        />
        <span id={currencyId} className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-sm font-semibold text-[#789089]">
          {currency}
        </span>
      </div>
      {hint && !error && <p id={hintId} className="text-sm text-[#5d716b]">{hint}</p>}
      {error && <p id={errorId} className="text-sm font-medium text-[#a43d32]">{error}</p>}
    </div>
  );
}

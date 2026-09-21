import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { AuthProvider } from "@/components/auth-provider";
import { LocaleProvider } from "@/components/locale-provider";
import type { Locale } from "@/lib/i18n/locales";

export function renderWithLocale(ui: ReactElement, locale: Locale = "en") {
  return render(<LocaleProvider initialLocale={locale}>{ui}</LocaleProvider>);
}

export function renderWithProviders(ui: ReactElement, locale: Locale = "en") {
  return render(
    <LocaleProvider initialLocale={locale}>
      <AuthProvider>{ui}</AuthProvider>
    </LocaleProvider>,
  );
}

export const TEST_HOUSEHOLD = { id: 1, name: "Home", currency_code: "COP", time_zone: "America/Bogota", role: "owner" } as const;
export const TEST_USER = { id: 1, email: "test@example.com", households: [TEST_HOUSEHOLD] };

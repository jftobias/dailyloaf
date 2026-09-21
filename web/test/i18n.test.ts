import { describe, expect, it } from "vitest";
import { createTranslator, flattenMessages, messageKeys } from "@/lib/i18n/dictionary";
import { messages as en } from "@/lib/i18n/messages/en";
import { messages as es } from "@/lib/i18n/messages/es";
import { INTL_LOCALES, isLocale, pickLocale } from "@/lib/i18n/locales";
import { ApiError } from "@/lib/api-client";
import { apiErrorMessage, formErrors, localizeFieldMessage } from "@/lib/form-errors";
import { categoryLabel } from "@/lib/i18n/presentation";
import { displayTransactionAmount, formatMoney, positiveAmountToImpact } from "@/lib/financial-format";

describe("locale selection", () => {
  it("selects Spanish when the browser's preferred language starts with es", () => {
    expect(pickLocale("es-CO,es;q=0.9,en;q=0.8")).toBe("es");
    expect(pickLocale("es-MX")).toBe("es");
    expect(pickLocale("es;q=0.7,en;q=0.9")).toBe("en");
  });

  it("defaults to English for other or absent preferences", () => {
    expect(pickLocale("en-US,en;q=0.9")).toBe("en");
    expect(pickLocale("fr-FR,fr;q=0.9")).toBe("en");
    expect(pickLocale(null)).toBe("en");
    expect(pickLocale("")).toBe("en");
  });

  it("lets a valid persisted cookie win over the browser preference", () => {
    expect(pickLocale("en-US", "es")).toBe("es");
    expect(pickLocale("es-CO", "en")).toBe("en");
    expect(pickLocale("en-US", "fr")).toBe("en");
    expect(pickLocale("es-CO", "fr")).toBe("es");
  });

  it("validates locale values", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("es")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

describe("dictionaries", () => {
  it("keeps English and Spanish keys structurally identical", () => {
    expect(messageKeys(es as unknown as Record<string, unknown>)).toEqual(messageKeys(en as unknown as Record<string, unknown>));
  });

  it("has no empty translation values", () => {
    for (const flat of [flattenMessages(en), flattenMessages(es as unknown as Record<string, unknown>)]) {
      for (const [key, value] of Object.entries(flat)) {
        expect(value.trim(), `empty translation: ${key}`).not.toBe("");
      }
    }
  });

  it("translates with interpolation and falls back to the key when missing", () => {
    const t = createTranslator("es");
    expect(t("nav.overview")).toBe("Resumen");
    expect(t("accounts.pendingProjected", { pending: "$1", projected: "$2" })).toContain("$1");
    expect(t("does.not.exist")).toBe("does.not.exist");
    expect(createTranslator("en")("nav.accounts")).toBe("Accounts");
  });

  it("uses es-CO and en-US Intl locales", () => {
    expect(INTL_LOCALES.es).toBe("es-CO");
    expect(INTL_LOCALES.en).toBe("en-US");
  });
});

describe("localized API errors", () => {
  it("maps known codes to localized messages", () => {
    const enT = createTranslator("en");
    const esT = createTranslator("es");
    expect(apiErrorMessage(new ApiError(401, "unauthorized", "Raw Rails message"), enT)).toBe("Your session has expired. Please sign in again.");
    expect(apiErrorMessage(new ApiError(401, "invalid_credentials", "Invalid email or password"), esT)).toBe("Correo electrónico o contraseña incorrectos.");
  });

  it("never exposes raw Rails messages or exceptions", () => {
    const t = createTranslator("en");
    expect(apiErrorMessage(new ApiError(500, "boom", "PG::Error something sensitive"), t)).toBe("Something went wrong. Please try again.");
    expect(apiErrorMessage(new TypeError("fetch failed internals"), t)).toBe("The API is unavailable. Please try again.");
    expect(apiErrorMessage(new ApiError(500, "totally_unknown_code", "x"), t)).toBe("Something went wrong. Please try again.");
  });

  it("localizes field-level validation messages", () => {
    const t = createTranslator("es");
    expect(localizeFieldMessage("can't be blank", t)).toBe("Este campo es obligatorio.");
    expect(localizeFieldMessage("has already been taken", t)).toBe("Este valor ya está en uso.");
    expect(localizeFieldMessage("something unexpected", t)).toBe("Revisa este campo.");
  });

  it("returns a localized form message for validation_failed details", () => {
    const t = createTranslator("en");
    const result = formErrors(new ApiError(422, "validation_failed", "Validation failed", { name: ["can't be blank"] }), t);
    expect(result.form).toBe("Please review the highlighted fields.");
    expect(result.fields.name).toBe("This field is required.");
  });
});

describe("presentation boundary", () => {
  const salary = { name: "Salary", is_default: true };
  const custom = { name: "Mi categoría", is_default: false };
  const archivedCustom = { name: "Old custom", is_default: false, archived_at: "2026-01-01" };

  it("localizes built-in default categories without touching persisted names", () => {
    expect(categoryLabel(salary, createTranslator("en"))).toBe("Salary");
    expect(categoryLabel(salary, createTranslator("es"))).toBe("Salario");
  });

  it("never translates user-created or archived custom names", () => {
    expect(categoryLabel(custom, createTranslator("es"))).toBe("Mi categoría");
    expect(categoryLabel(archivedCustom, createTranslator("es"))).toBe("Old custom");
  });
});

describe("decimal preservation and formatting", () => {
  it("keeps API amounts as strings for business logic", () => {
    expect(positiveAmountToImpact("expense", "12.3400")).toBe("-12.3400");
    expect(positiveAmountToImpact("income", "500.0000")).toBe("500.0000");
    expect(displayTransactionAmount("expense", "-12.3400")).toBe("12.3400");
  });

  it("formats money locale-aware without mutating the decimal string", () => {
    const enOut = formatMoney("1234567.8900", "COP", "en-US");
    const esOut = formatMoney("1234567.8900", "COP", "es-CO");
    expect(enOut).toMatch(/1,234,56[78]/);
    expect(esOut).toMatch(/1\.234\.56[78]/);
    expect(formatMoney("not-a-number", "COP", "en-US")).toBe("not-a-number COP");
  });

  it("never leaks raw numeric(19,4) precision into money display", () => {
    // COP: browsers render 0 fraction digits ($34.162 / COP 34,162); the exact
    // "34161.5496" string must never appear in the UI.
    const enOut = formatMoney("34161.5496", "COP", "en-US");
    const esOut = formatMoney("34161.5496", "COP", "es-CO");
    expect(enOut).toMatch(/34,16[12]/);
    expect(esOut).toMatch(/34\.16[12]/);
    expect(enOut).not.toContain("5496");
    expect(esOut).not.toContain("5496");
    // USD keeps two fraction digits.
    expect(formatMoney("34161.5496", "USD", "en-US")).toContain("34,161.55");
  });
});

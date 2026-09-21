import { ApiError } from "@/lib/api-client";
import type { TFunction } from "@/lib/i18n/dictionary";

const FIELD_PATTERNS: ReadonlyArray<[RegExp, string]> = [
  [/blank|required|empty/i, "errors.fields.blank"],
  [/taken|already/i, "errors.fields.taken"],
  [/invalid|not a valid/i, "errors.fields.invalid"],
  [/too short|minimum/i, "errors.fields.tooShort"],
];

/** Localized, user-safe message for any error — never leaks raw exceptions. */
export function apiErrorMessage(error: unknown, t: TFunction): string {
  if (!(error instanceof ApiError)) return t("errors.api.network_error");
  const key = `errors.api.${error.code}`;
  const localized = t(key);
  return localized === key ? t("errors.api.unknown") : localized;
}

export function localizeFieldMessage(message: string, t: TFunction): string {
  for (const [pattern, key] of FIELD_PATTERNS) {
    if (pattern.test(message)) return t(key);
  }
  return t("errors.fields.generic");
}

export function formErrors(error: unknown, t: TFunction) {
  if (!(error instanceof ApiError)) {
    return { form: t("errors.api.network_error"), fields: {} as Record<string, string> };
  }

  const details = error.details;
  const fields: Record<string, string> = {};
  if (details && typeof details === "object") {
    for (const [key, value] of Object.entries(details)) {
      if (Array.isArray(value) && typeof value[0] === "string") fields[key] = localizeFieldMessage(value[0], t);
    }
  }

  return {
    form: Object.keys(fields).length > 0 ? t("errors.api.validation_failed") : apiErrorMessage(error, t),
    fields,
  };
}

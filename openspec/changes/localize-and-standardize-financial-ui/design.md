# Design: Localize and standardize financial UI

## Locale resolution

Locales: `en` (default) and `es`. Resolution order, evaluated once per request in the async root layout:

1. `dailyloaf_locale` cookie with a supported value wins (explicit user choice).
2. Otherwise the highest-priority `Accept-Language` tag selects `es` when its base subtag is `es`.
3. Otherwise `en`.

The root layout is a Server Component, so `await cookies()` / `await headers()` resolve the locale server-side; the resolved locale and flattened dictionary are passed into a client `LocaleProvider`. Server output and first client render therefore always agree — no hydration mismatch. The `<html lang>` attribute is set from the same value; a client-side locale switch updates context, writes the cookie (`path=/`, `max-age=1y`, `samesite=lax`, `secure` on HTTPS), and updates `document.documentElement.lang` without a reload. Locale is never stored in auth state and carries no secret.

`useT()` returns a `t(key, vars?)` lookup over the flattened dictionary with `{name}` interpolation; `useLocale()` returns the active locale and `Intl` tag (`en-US` / `es-CO`).

## Dictionaries

`lib/i18n/messages/en.ts` is the source of truth (`export const messages = {...} as const`). `es.ts` declares `satisfies Messages`, giving compile-time structural parity; a Vitest test additionally asserts the flattened key sets are identical, catching runtime drift. Adding a locale means adding a messages file satisfying the same type, extending `LOCALES`, and adding labels to the selector.

## Presentation boundary

Persisted values (enum kinds, statuses, account types, visibility, canonical default-category names) are never translated. Helpers in `lib/i18n/presentation` map them to keys at render time: `enumLabel`, `statusLabel`, `accountTypeLabel`, `visibilityLabel`, and `categoryLabel` (which localizes only `is_default` categories by canonical name; user-created names render verbatim, including on archived historical records).

## Formatting

`formatMoney(value, currency, intlLocale)` and `formatDate(value, intlLocale, timeZone)` use `Intl` only. Decimal strings pass through unchanged to `Intl.NumberFormat` — no float arithmetic on API values; household currency and time zone drive formatting.

## API errors

`formErrors(error, t)` maps `ApiError.code` to `errors.api.*` (unauthorized, forbidden, invalid_credentials, invalid_request, invalid_json, invalid_csrf_token, not_found, rate_limited, validation_failed, network_error, unknown fallback). Field-level Rails messages are mapped to localized field errors where recognized; unknown detail falls back to a safe localized message. Global 401 handling, CSRF, and idempotency behavior are unchanged.

## Component primitives

`components/ui/` gains: `Button`/`buttonClasses` (primary, secondary, destructive, ghost × sm, md, lg; consistent height/padding/focus/disabled/loading), `Alert` (single assertive error region, null/blank guard — fixes the empty frame), `SelectField`, `StatusBadge`, `EmptyState`, and `Panel`. `ConfirmDialog` keeps focus management and uses shared buttons with a localized cancel label. `ErrorSummary` and `FinancialError` are replaced by `Alert`.

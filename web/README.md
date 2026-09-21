# DailyLoaf Web

Next.js 16 (App Router, React, TypeScript, Tailwind CSS) frontend for DailyLoaf.

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm test       # vitest
pnpm lint
pnpm typecheck
pnpm build
```

## Localization (en / es)

The app is fully localized in English (`en`) and Latin American Spanish (`es`)
without locale-prefixed routes.

### Locale resolution

- `app/layout.tsx` is an async server component that calls
  `resolveLocale()` (`lib/i18n/server.ts`) before rendering.
- Resolution order: the `dailyloaf_locale` cookie (explicit user choice) wins;
  otherwise the highest-priority `Accept-Language` tag selects Spanish when its
  base subtag is `es`; everything else defaults to English. See `pickLocale`
  in `lib/i18n/locales.ts`.
- The resolved locale is set on `<html lang>` and passed to
  `components/locale-provider.tsx` as `initialLocale`, so server and client
  rendering always agree — no hydration mismatch.
- `components/language-selector.tsx` renders a visible selector on the landing
  page, auth layout, and authenticated shell. Choosing a language writes the
  `dailyloaf_locale` cookie (`path=/`, `samesite=lax`, `secure` on HTTPS) and
  updates state client-side; the cookie makes the choice sticky across
  requests. The locale is a UI preference only — it is never stored in
  authentication state.

### Translations

- Dictionaries live in `lib/i18n/messages/en.ts` (source of truth) and
  `lib/i18n/messages/es.ts`, which must satisfy the widened `Messages` type —
  missing keys fail typecheck. `test/i18n.test.ts` additionally asserts
  flattened key parity at runtime.
- Components read strings through `useT()` / `useI18n()` from
  `components/locale-provider.tsx`. Interpolation uses `{name}` placeholders:
  `t("accounts.pendingProjected", { pending, projected })`.
- Persisted identifiers, enum values, API field names, and user-created content
  are never translated. Labels for canonical values (account types, kinds,
  statuses, visibility, default categories) are mapped at the presentation
  boundary in `lib/i18n/presentation.ts` — e.g. `categoryLabel` localizes only
  `is_default` built-in categories by their canonical name.
- Backend error codes map to localized messages in `lib/form-errors.ts`
  (`apiErrorMessage`, `formErrors`, `localizeFieldMessage`). Raw Rails messages
  and unknown codes fall back to a safe generic message.

### Formatting

`lib/financial-format.ts` exposes `formatMoney`, `formatDate`, and
`formatDateTime` with an explicit Intl locale (`en-US` / `es-CO`). Components
should use `useFormatters()` (`lib/i18n/use-formatters.ts`), which binds the
active locale. Monetary API values remain decimal strings end-to-end — Intl is
display-only, never business math. Dates use the household `time_zone`.

### Adding a locale

1. Add the locale tag to `LOCALES`, `INTL_LOCALES`, and `LOCALE_LABELS` in
   `lib/i18n/locales.ts`.
2. Create `lib/i18n/messages/<locale>.ts` implementing `Widen<Messages>`.
3. Register it in `dictionaries` in `lib/i18n/dictionary.ts`.
4. Extend `pickLocale` if the new base language should auto-select.
5. The parity test will fail until every key is translated.

## Shared UI primitives

Reusable primitives live in `components/ui/`:

- `button.tsx` — `Button` + `buttonClasses` (variants: `primary`, `secondary`,
  `destructive`, `ghost`; sizes `sm`/`md`/`lg` with fixed heights and focus
  rings; `loading` state; use `buttonClasses` for links styled as buttons).
- `alert.tsx` — `Alert`, the single assertive error region. Renders nothing
  (and reserves no space) for null/empty/whitespace messages; emits
  `role="alert"` only for real content.
- `form-field.tsx`, `ui/select-field.tsx`, `password-field.tsx` — labeled
  controls sharing `ui/control-classes.ts` (one control height, focus ring,
  `aria-invalid`/`aria-describedby` wiring).
- `panel.tsx` — `Panel` card container.
- `status-badge.tsx` — `StatusBadge` pill (`neutral`/`active`/`muted`/`danger`).
- `empty-state.tsx` — `EmptyState` dashed empty-state box.
- `components/confirm-dialog.tsx` — destructive-action dialog with Escape
  handling, a minimal focus trap, initial focus on Cancel, and focus restore.

# Tasks: Localize and standardize financial UI

- [x] Add locale resolution (cookie, Accept-Language, default) in the root layout and a hydration-safe `LocaleProvider` with `useT`/`useLocale`.
- [x] Author complete, structurally equivalent `en` and `es` dictionaries covering all screens, dialogs, states, validation, and errors.
- [x] Add a visible, accessible language selector to public and authenticated layouts; persist the choice in a cookie.
- [x] Localize enum/status/type labels and built-in default-category display names at the presentation boundary.
- [x] Make money/date formatting locale-aware via `Intl` while preserving decimal strings and household currency/time zone.
- [x] Map API error codes and field messages to localized strings with a safe fallback.
- [x] Create shared UI primitives (button, alert, select field, status badge, empty state, panel) and migrate every page.
- [x] Fix the empty alert defect globally; add regression tests for absent and real alerts.
- [x] Add tests for locale selection, persistence, parity, formatting, localized errors, and hydration agreement.
- [x] Document the localization architecture and how to add a locale.
- [x] Run openspec validate, pnpm test/lint/typecheck/build, backend regression, and git diff --check.
- [x] Pass the full browser acceptance workflow in both English and Spanish.

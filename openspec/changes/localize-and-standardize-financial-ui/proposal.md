# Proposal: Localize and standardize financial UI

## Why

The first production review of `https://dailyloaf.online` found three classes of defects:

1. An empty red alert frame renders at the top of `/app/accounts/new` before any error occurs, because the financial error component renders unconditionally while the auth error component null-guards — two divergent implementations of the same primitive.
2. Buttons, inputs, selects, alerts, and cards carry inconsistent heights, padding, and states because every page inlines its own styling.
3. The entire frontend is English-only while the initial household audience is Spanish-speaking.

## What changes

- Introduce a cookie- and browser-preference-based `en`/`es` localization layer using nested dictionaries, a typed `t()` helper, and a provider that guarantees server/client agreement without locale-prefixed routes.
- Localize every user-facing string across landing, auth, navigation, overview, accounts, transactions, transfers, categories, dialogs, empty states, validation, errors, loading states, and accessibility labels.
- Provide localized display names for built-in default categories and enum labels at the presentation boundary only; persisted identifiers, enum values, and user-created names are never translated.
- Fix the empty-alert defect globally via one shared alert primitive that never renders without non-blank content.
- Consolidate ad-hoc inline controls into shared UI primitives (button, alert, select field, status badge, empty state, panel) with explicit variants and sizes.
- Add automated dictionary-parity, locale-resolution, formatting, and component regression coverage.

## Non-goals

- No locale-prefixed URLs (`/es/...`), domain routing, or redirects.
- No backend changes to calculations, enums, identifiers, or persisted values.
- No translation of user-created content or AI/machine-translation features.
- No OpenAI key or AI functionality.

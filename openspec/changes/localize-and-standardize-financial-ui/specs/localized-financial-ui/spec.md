# Localized and standardized financial UI

## ADDED Requirements

### Requirement: Locale selection and persistence

The frontend SHALL support `en` and `es`. It SHALL select `es` automatically when the browser's preferred language begins with `es`, otherwise default to `en`. An explicit user selection SHALL persist in a non-authentication cookie and SHALL override detection. A visible, accessible language selector SHALL be present on public and authenticated layouts. Server and client rendering SHALL agree on the locale so no hydration mismatch occurs. Locale SHALL never be stored in authentication state, and no secret SHALL be exposed through locale handling.

#### Scenario: Browser prefers Spanish

- **GIVEN** a browser whose highest-priority Accept-Language tag is `es-CO`
- **AND** no stored locale cookie
- **WHEN** any page loads
- **THEN** the interface renders in Spanish and `<html lang="es">`

#### Scenario: Explicit selection persists

- **GIVEN** a visitor switches the selector to English
- **WHEN** the page is reloaded or revisited later
- **THEN** English renders regardless of browser preference

### Requirement: Complete bilingual interface

All user-facing text — landing, registration, login, navigation, overview, accounts, transactions, transfers, categories, confirmation dialogs, empty states, loading states, validation messages, error messages, success messages, and accessibility labels — SHALL resolve through stable translation keys with complete, structurally equivalent English and Spanish dictionaries using natural Latin American Spanish. Missing keys SHALL be detectable automatically.

#### Scenario: Dictionary parity enforced

- **WHEN** the test suite runs
- **THEN** the flattened key sets of `en` and `es` are asserted identical

### Requirement: Presentation-only localization

Persisted identifiers, enum values, API field names, and ledger values SHALL NOT be translated. Built-in default category names SHALL display localized labels while retaining their canonical persisted names; user-created and archived category names SHALL render verbatim. Financial queries, authorization, and record relationships SHALL be unaffected.

#### Scenario: Default category localized, custom verbatim

- **GIVEN** a household with built-in `Groceries` and custom `Mascotas`
- **WHEN** the UI renders in Spanish
- **THEN** `Groceries` displays as `Mercado` and `Mascotas` renders unchanged

### Requirement: Locale-aware formatting

Monetary and date display SHALL use `Intl` with the active locale tag (`en-US`, `es-CO`), the household currency, and the household time zone. API decimal strings SHALL remain strings end-to-end; no business calculation SHALL use floating-point conversion of API values.

#### Scenario: Spanish money formatting

- **GIVEN** the locale is `es` and currency `COP`
- **THEN** amounts format via `es-CO` conventions without altering stored values

### Requirement: Localized safe errors

Known backend error codes SHALL map to localized messages; unknown failures SHALL show a localized safe fallback; raw exceptions SHALL never render. Global 401 handling, CSRF, and idempotency behavior SHALL be preserved.

#### Scenario: Unknown failure

- **WHEN** a non-ApiError failure occurs in Spanish
- **THEN** a localized generic message renders inside an assertive alert

### Requirement: Shared UI primitives and alert hygiene

Reusable primitives SHALL provide explicit button variants (primary, secondary, destructive, ghost) and sizes (sm, md, lg) with consistent heights, padding, typography, focus, disabled, and loading states; equivalent actions SHALL share sizing. Alerts SHALL render only with non-blank content, reserve no visual height when absent, and use `role="alert"` only for real errors. Field labels, errors, `aria-invalid`, and `aria-describedby` SHALL remain correctly associated; dialogs SHALL keep focus management and accessible names.

#### Scenario: Account form shows no empty alert

- **GIVEN** `/app/accounts/new` renders initially
- **THEN** no element with `role="alert"` exists and no red frame reserves space

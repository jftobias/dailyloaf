# Tasks: Build debt management and analytics

## Backend — debt profiles

- [x] Create `debt_profiles` migration with exact-decimal columns, unique `account_id`, composite household FK, and check constraints (rate/payment non-negative, due day 1–31, principal > 0).
- [x] Add `DebtProfile` model (liability-only, same-household, validations) and `Account#debt_profile` association.
- [x] Add `DebtsController` (index/show/projection) and `DebtProfilesController` (show/create/update/destroy) under the household scope with 404 isolation.
- [x] Implement `DebtProjectionService` (declining-balance monthly, zero-interest, non-amortizing detection, 600-month cap, half-even rounding, household time zone).
- [x] Backend specs: profile constraints, household isolation, privacy, archived behavior, payments via transfers + reversal, decimal strings, projection cases.

## Backend — analytics

- [x] Add analytics index migration on `financial_transactions` if needed.
- [x] Implement `AnalyticsService` (scoped, interval-bucketed, reversal-aware, bounded queries, previous period, balance reconstruction).
- [x] Add `AnalyticsController#show` with parameter validation.
- [x] Backend specs: reversal/replacement handling, transfer exclusion, category-less rows, previous period, time-zone boundaries, privacy scope, query count.

## Frontend

- [x] Select and install pinned chart library (Recharts); document bundle impact.
- [x] Extend `api-client` types/functions (debts, debt profile, projection, analytics).
- [x] Add `/app/debts` list and `/app/debts/[accountId]` detail (profile form, payment via transfer, projection, progress, archive states).
- [x] Add `/app/analysis` (filters, comparison cards, charts, accessible tables, empty states).
- [x] Add nav links (Debts, Analysis) preserving responsive layout at 375 px.
- [x] Add complete en/es dictionary entries; keep parity tests green.
- [x] Frontend tests: localized debt/analysis UI, validation, payment workflow, projection states, chart data formatting, empty states, nav, decimal strings, CSRF/idempotency, 401.

## Validation

- [x] `openspec validate --all`, `docker compose config/build`, `db:prepare`, RSpec, RuboCop, Brakeman, Bundler Audit, pnpm test/lint/typecheck/build, `git diff --check`.
- [x] Full browser acceptance workflow in English and Spanish (desktop/tablet/375 px, no overflow, no console errors).

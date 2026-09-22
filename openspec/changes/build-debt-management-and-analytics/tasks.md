# Tasks: Build debt management and analytics

## Backend — debt profiles

- [x] Create `debt_profiles` migration with exact-decimal columns, unique `account_id`, composite household FK, and check constraints (rate/payment non-negative, due day 1–31, principal > 0).
- [x] Add `DebtProfile` model (liability-only, same-household, validations) and `Account#debt_profile` association.
- [x] Add `DebtsController` (index/show/projection) and `DebtProfilesController` (show/create/update/destroy) under the household scope with 404 isolation.
- [x] Implement `DebtProjectionService` (declining-balance monthly, zero-interest, non-amortizing detection, 600-month cap, half-even rounding, household time zone).
- [x] Backend specs: profile constraints, household isolation, privacy, archived behavior, payments via transfers + reversal, decimal strings, projection cases.
- [x] Enforce the transfer aggregate boundary: reject transaction-level mutation of transfer legs (update/post/reverse/correct/delete) with a stable `transfer_leg_mutation` error, keep legs readable, and roll back partial aggregate reversals. Model/service/request regression coverage.
- [x] Render money with currency-aware formatting (no raw `numeric(19,4)` strings in cards, tooltips, axes, tables, or accessible summaries); en/es regression tests.

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

## Backend — credit limit, availability, and opening-balance normalization

- [x] Add `accounts.credit_limit` (`numeric(19,4)`, check `> 0` when present); model restricts it to `credit_card` accounts.
- [x] Normalize `opening_balance` in `AccountService.create!` (non-negative user-facing input → canonical signed value; reject negative input) and enforce persisted sign in `Account` validations.
- [x] Serialize `credit_limit`, `available_credit`, `utilization_percentage`, `over_limit_amount` in the debt response for credit cards with a limit (BigDecimal, decimal strings, projected balance).
- [x] Permit `credit_limit` (and keep `name`) on account update; keep `opening_balance` excluded.
- [x] Backend specs: limit storage/serialization, credit-card-only rule, missing limit, availability/utilization incl. pending, over-limit, payment/reversal effects, totals exclusion, opening-balance normalization per type, profile removal preserving history.

## Frontend — inputs, card UX, and copy

- [x] Remove internal implementation copy (landing footer etc.) from dictionaries and components; regression test for both locales.
- [x] Build `MoneyField`/`MoneyInput` + `lib/money-input.ts` (locale separators, grouping on blur, canonical decimal string, currency adornment, `inputMode="decimal"`); apply to all monetary forms.
- [x] Account form: liability "amount currently owed" (positive), credit-card "total credit limit" field, currency shown, debt-vs-limit explanation.
- [x] Debt detail: limit/available/utilization/over-limit display with accessible indicator + "estimated from recorded transactions" note; visible Edit card info / Record payment / Archive card / Remove debt configuration actions with explanatory dialogs.
- [x] Frontend tests: en/es labels, no internal phrases, card-only limit field, money-input parse/format/paste, canonical payloads, positive owed amount, edit/archive/remove discoverability, availability + over-limit display, accessible utilization.

## Validation

- [x] `openspec validate --all`, `docker compose config/build`, `db:prepare`, RSpec, RuboCop, Brakeman, Bundler Audit, pnpm test/lint/typecheck/build, `git diff --check`.
- [x] Full browser acceptance workflow in English and Spanish (desktop/tablet/375 px, no overflow, no console errors).
- [x] Fresh bilingual acceptance on a new user without console corrections: positive owed amount, limit/availability/utilization, pending impact, edit/remove/archive, analysis exclusion, responsive checks.

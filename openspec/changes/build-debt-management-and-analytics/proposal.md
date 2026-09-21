# Proposal: Build debt management and analytics

## Why

DailyLoaf already tracks liability accounts (credit cards, loans) through the
core ledger, but offers no structured debt metadata, no payoff planning, and no
household-level financial analysis. Members cannot answer basic questions like
"when will this debt be paid off?", "how does my net worth trend?", or "where
does spending concentrate?" without leaving the app.

## What changes

- Add a `DebtProfile` metadata model attached one-to-one to liability accounts.
  The account ledger remains the sole authoritative balance; the profile only
  stores creditor, rate, payment, and date metadata.
- Add debt API endpoints (list, show, profile CRUD, payoff projection) under the
  existing household-scoped versioned API. Debt payments reuse the existing
  `Transfer` aggregate — no new balance math, no second authoritative balance.
- Add a deterministic, Rails-computed payoff projection (declining-balance
  monthly convention, capped horizon, non-amortizing detection).
- Add a household-scoped analytics endpoint producing summary totals,
  previous-period comparison, interval time series (net worth, assets vs.
  liabilities, income vs. expenses, net cash flow, debt), and category
  breakdowns — all decimal strings, posted records only, reversal-aware.
- Add `/app/debts`, `/app/debts/[accountId]`, and `/app/analysis` pages with
  responsive, accessible, localized charts (Recharts) and textual/table
  fallbacks. Navigation gains Debts/Deudas and Analysis/Análisis links.
- Extend English and Spanish dictionaries for all new UI.

## Out of scope

- Variable/promotional rate schedules, amortization imports, automatic payment
  execution, credit-bureau integrations, refinancing, multi-currency debt,
  AI-generated advice, bank integrations, and any OpenAI functionality.

## Risks

- Analytics queries could fan out; bounded by grouped aggregate queries, capped
  date ranges, and indexes on `financial_transactions`.
- Chart bundle impact; mitigated by selecting a maintained SVG library
  (Recharts) loaded only on the analysis/debt pages.

# Design: Debt management and analytics

## Data model

`debt_profiles` — one-to-one metadata on liability accounts only:

| column | type | constraints |
| --- | --- | --- |
| household_id | bigint | FK households, not null; composite FK (household_id, account_id) → accounts(household_id, id) |
| account_id | bigint | unique index, not null |
| creditor_name | string | optional |
| annual_interest_rate | decimal(9,5) | not null, >= 0, < 1000 — stored as a **percentage** (19.99 = 19.99% APR) |
| minimum_payment | decimal(19,4) | not null, >= 0 |
| planned_monthly_payment | decimal(19,4) | optional, >= 0 when present |
| payment_due_day | integer | optional, 1–31 |
| original_principal | decimal(19,4) | optional, > 0 when present |
| opened_on / maturity_on | date | optional |
| notes | text | optional |
| created_at / updated_at | datetime | |

Invariants: one profile per account; same household enforced by composite FK +
model validation; `account.liability?` required; archiving an account keeps the
profile (historical). **No balance column is stored** — `posted_balance`
(opening + posted impacts) stays authoritative.

## Sign convention (existing, verified)

Liability balances are negative (`OverviewService` presents
`liabilities = -balance`). A transfer **into** a liability account adds
`+amount`, shrinking the debt. An `expense` transaction on a liability account
(negative impact, expense category required) **grows** the debt — this is how
interest/fees are recorded. Debt payment = existing transfer: source active
asset → destination active liability, same household/currency/visibility rules,
idempotency and reversal unchanged. Transfers are never income/expense.

## Opening-balance normalization boundary

Root cause of the acceptance console fix: `AccountService.create!` persisted
`opening_balance` verbatim, and the form offered no sign guidance, so a
positive "amount owed" stored an asset-side balance on a liability account.

Single normalization boundary — `AccountService.create!`:

- The API receives `opening_balance` as a **non-negative user-facing amount**
  ("amount currently owed" for liabilities). Negative input is rejected with a
  validation error.
- The service converts to the canonical signed value by `account_type`:
  liability types → `-amount`, asset types → `+amount`.
- `Account` validates the persisted sign (liability `<= 0`, asset `>= 0`) so an
  invalid sign can never enter the ledger regardless of client.
- Serializers keep exposing the canonical signed `opening_balance`; debt
  surfaces already present `-balance` as the positive debt magnitude.
- Frontend never negates — it always submits the positive entered value, so
  account-type changes cannot double-negate.
- Existing rows: dev/test data only; no production data and no backfill —
  previously entered liabilities with wrong signs are invalid fixtures, not
  data to migrate.

## Credit limit and available credit

`credit_limit` lives on **`accounts`**, not `debt_profiles`. Rationale: the
limit is a property of the card contract, editable alongside the account name
through the account resource, and must survive "remove debt configuration"
(which deletes only payoff metadata). `debt_profile` removal therefore never
erases the limit. Deviation from the suggested placement is deliberate.

- `accounts.credit_limit` — `numeric(19,4)`, nullable, check constraint `> 0`
  when present; model allows it only when `account_type == "credit_card"`.
  Rejected (422) on loans and other liabilities; existing cards stay valid
  with `NULL`; no backfill.
- Available credit is computed in `DebtsController#debt_json` (serialized for
  credit-card accounts with a limit):
  `available_credit = credit_limit - projected_debt_balance` where
  `projected_debt_balance = -projected_balance` (posted + pending impacts).
  `utilization_percentage = projected_debt_balance / credit_limit * 100`,
  half-even rounded to 2 decimal places; `over_limit_amount =
  max(0, projected_debt_balance - credit_limit)`. All `BigDecimal`, all
  decimal-string JSON, negative available credit preserved.
- Pending transactions reduce projected availability; posted/reversed activity
  shifts it through the same projected-balance path — no separate math.
- Available credit is **borrowing capacity only**: it is metadata derived from
  the ledger, not a transaction, so net worth, assets, income, and cash flow
  are structurally unaffected (proved by regression specs).

## Card/debt detail UX

- Prominent labeled actions on the debt detail page: **Edit card information**
  (account name + credit limit via account PATCH, plus debt-profile fields via
  profile POST/PATCH), **Record payment** (existing transfer form), **Archive
  card** (existing archive endpoint).
- "Remove debt configuration" deletes only the `DebtProfile` — the dialog
  states the account, limit, and transaction history remain.
- No hard delete for accounts with ledger history; archival is the
  user-facing removal path. Unused-account deletion is not introduced.
- Credit-card detail shows: limit, posted/projected debt, available credit,
  utilization bar (accessible progressbar + textual summary), over-limit
  state, and a note that availability is estimated from transactions recorded
  in DailyLoaf.

## Localized money input

`MoneyField` (labeled) / `MoneyInput` (bare) component backed by
`lib/money-input.ts` helpers, applied to every monetary form (opening
balance, credit limit, transaction/transfer amounts, debt payment, profile
money fields):

- Canonical value is always a decimal string (`"500000"`, `"1234.56"`); no
  Float for canonical conversion or validation.
- While focused, members type/paste freely with locale decimal separator
  (`,` for `es`, `.` for `en`) and the opposite separator treated as
  grouping; on blur the display is grouped via `Intl.NumberFormat` (max 4
  fraction digits, no forced `0.0000`). On focus the raw canonical value is
  shown for editing — no cursor jumping, no silent rewrites.
- Currency code shown as an input adornment; `inputMode="decimal"`;
  `aria-describedby` links hint/error/currency context.
- The account form labels liability opening input "amount currently owed"
  (positive) and shows a separate "total credit limit" field for credit
  cards, explaining the two values are independent.

## Product copy

The landing footer and any other copy mentioning Rails, services, or storage
internals is replaced with user-focused language; a regression test asserts
the internal phrases never render in either locale.

## API

- `GET /api/v1/households/:hid/debts` — liability accounts visible to the user
  with balances, embedded profile (when present), and progress/payoff summary.
- `GET /api/v1/households/:hid/debts/:account_id` — single debt (404 for
  non-liability, invisible, or cross-household accounts).
- `GET /api/v1/households/:hid/debts/:account_id/projection` — payoff estimate.
- `POST|PATCH|DELETE /api/v1/households/:hid/accounts/:account_id/debt_profile`
  — singleton profile CRUD on the account resource.

Deviation from the suggested contract: `debts` is keyed by `:account_id`
because a debt *is* a liability account; the profile is a singleton nested
resource. Payments deliberately have no new endpoint — `POST /transfers` is
reused.

## Payoff projection (`DebtProjectionService`)

Convention (documented MVP): declining-balance monthly simulation.

- `balance = -posted_balance` (positive amount owed; ≤ 0 → paid off, 0 months)
- `payment = planned_monthly_payment.presence || minimum_payment`
- `monthly_rate = annual_interest_rate / 100 / 12` (BigDecimal)
- Each month: `interest = balance * monthly_rate` (rounded half-even to 4 dp);
  `balance += interest - payment`; `months += 1`; `total_interest += interest`.
- Non-amortizing: `payment <= balance * monthly_rate` on entry (payment cannot
  cover first-month interest, or payment ≤ 0 with a positive balance) →
  `amortizing: false`, `months`/`payoff_date` null. Also flagged when the
  **600-month (50-year) horizon** is exceeded — the documented maximum.
- `payoff_date` = today (household time zone) + months, half-even rounded
  outputs at 4 dp as decimal strings.
- Clearly labelled estimate; no claims for variable rates, fees, or changing
  payments. Zero-interest supported (linear amortization).

## Analytics (`AnalyticsService`)

`GET /api/v1/households/:hid/analytics?scope=&from=&to=&interval=`

- `scope` ∈ shared|private|combined (same `visible_accounts` semantics);
  `interval` ∈ day|week|month; dates ISO. Range capped at 5 years and 370
  buckets; `from <= to` required; 422 on invalid params.
- Buckets align to calendar day / week (Mon-Sun) / month overlapping [from,to].
- **Income/expense per bucket**: posted `income`/`expense` impacts plus posted
  `balance_adjustment` rows whose `reversal_of` is income/expense — counted in
  the reversal's own `occurred_on` bucket, identical to `OverviewService`.
  `transfer` legs and non-income/expense adjustments are excluded; category-less
  rows are safe.
- **Balance reconstruction**: `balance(a, t) = opening_balance (if t >=
  opening_balance_date) + Σ posted account_impact where occurred_on <= t`.
  Computed from one grouped sum (account_id × occurred_on) accumulated per
  account — no per-bucket queries. Net worth = Σ all balances; assets =
  Σ asset balances; liabilities/debt = −Σ liability balances.
- **Previous period**: same-length window immediately before `from`
  (`from - length .. from - 1`); comparison deltas returned.
- **Category breakdowns**: income and expense totals grouped by category
  (reversal rows attributed to `reversal_of.category`); response carries
  `category_id`, `name`, `is_default` so the client can localize defaults.
- **Debt series**: per visible liability account, balance per bucket end.
- Bounded queries: account list, grouped balance impacts, grouped kind/day
  sums, grouped category sums — ~5 queries regardless of bucket count.
- Index: `(household_id, status, occurred_on, kind)` on financial_transactions
  (existing `(household_id, occurred_on)` already covers part; add composite).

## Frontend

- **Chart library: Recharts** (pinned `3.x`, published > 7 days). Rationale:
  maintained, React 19 + Next 16 compatible, SVG output (DOM-inspectable,
  screen-reader friendlier than canvas), `ResponsiveContainer` for
  tablet/mobile, tooltips/legends built-in, tree-shakeable imports.
  Alternatives rejected: Chart.js (canvas, weaker a11y), visx (more code to
  maintain), hand-rolled SVG (reinvents tooltips/responsive logic).
  Bundle impact: ~110 kB gz; loaded only by analysis/debt pages.
- Decimal strings remain authoritative; `Number()` conversion happens **only**
  when mapping to chart coordinates. All displayed totals come from
  `fmt.money`/`fmt.date` (es-CO / en-US, household currency/time zone).
- Reduced motion: `prefers-reduced-motion` disables chart animation.
- Accessibility: every chart ships with a textual summary and an expandable
  data table; color is never the sole channel (labels, legend text, patterns of
  values in tables); palette reuses the existing `#0f4c4c`/`#b0802f` system.
- Navigation: `nav.debts` (`/app/debts`), `nav.analysis` (`/app/analysis`)
  inserted between Transactions and Categories; mobile nav already flex-wraps.
- Debt payment action on the debt page calls `createTransfer` with a generated
  idempotency key; archived liabilities are excluded from destination options.

## Deferred

Variable/promotional rates, amortization imports, automatic payments, credit
bureaus, refinancing, multi-currency debt, AI advice, scheduled projections.

# Design: Core financial ledger

## Canonical constraints and approved architecture

This change preserves the canonical `financial-overview` and `household-access` specifications. Rails/PostgreSQL remain authoritative; all household resources are membership-scoped; authenticated cross-household access returns `404`; shared/private authorization is enforced server-side; amounts use `numeric(19,4)`, rates use `numeric(20,10)`, Rails uses `BigDecimal`, and JSON emits decimal strings.

The MVP uses `Account`, `Category`, `FinancialTransaction`, and `Transfer` as an aggregate/service boundary. It does not add double-entry ledger entries. A transfer creates exactly two linked `FinancialTransaction` records with equal and opposite account impacts.

An ordinary PostgreSQL `CHECK` constraint cannot compare two rows, so equal-and-opposite transfer consistency is enforced by dedicated transfer services, database transactions, account row locking, validation, API restrictions, and comprehensive service specs. Transfer legs are never independently creatable, editable, or deletable through ordinary transaction endpoints.

## Household timezone and currency

Add `Household.time_zone` as a valid IANA identifier, defaulting during registration from an explicit request value or a safe application default. Browser locale must not control authorization or report boundaries. Timestamps remain UTC; `FinancialTransaction.occurred_on` is a `Date` representing the user's financial date.

The household `currency_code` is the uppercase ISO 4217 base currency. MVP account currency must equal the household base currency. Cross-currency accounts, transfers, conversion, exchange-rate tables, and live providers are deferred. Keep numeric(20,10) exchange-rate conventions documented for a future change but add no exchange-rate implementation now.

## Accounts

Account types:

- Asset: `cash`, `checking`, `savings`, `investment`, `other_asset`
- Liability: `credit_card`, `loan`, `other_liability`

Fields:

- `household_id`, `name`, `account_type`, `currency_code`
- immutable `opening_balance` numeric(19,4)
- `opening_balance_date`
- `visibility` (`shared` or `private`)
- `private_owner_id` only for private accounts
- `archived_at`
- timestamps

Positive normalized balance is value owned; negative normalized balance is amount owed. Asset deposits increase impact; asset withdrawals decrease it. Liability charges decrease impact; liability payments increase it. Examples: checking expense `-100`, salary `+1000`, credit-card purchase `-100`, payment checking `-100` and card `+100`.

Authoritative posted balance is:

```text
immutable opening_balance + sum(posted FinancialTransaction.account_impact)
```

No mutable authoritative current balance is stored. Opening balance cannot be changed after financial activity; correction uses a posted `balance_adjustment`. Archived accounts remain in historical reports, reject new ordinary transactions/transfers, may participate in authorized corrective reversal, and cannot be deleted with history.

Visibility is inherited exclusively from the account. Shared accounts have no private owner; private accounts require a household member owner. Transactions cannot override account visibility.

## Categories and default provisioning

Categories have `household_id`, `name`, `kind` (`income` or `expense`), `visibility` (`shared` or `private`), `private_owner_id` for private custom categories, `archived_at`, `is_default`, and timestamps.

Defaults, created for every household and safely backfilled for existing households with unique `(household_id, kind, name)` protection, are:

Income: `Salary`, `Freelance & business`, `Interest & dividends`, `Gifts & support`, `Other income`.

Expenses: `Housing`, `Utilities`, `Groceries`, `Dining out`, `Transportation`, `Health`, `Insurance`, `Education`, `Personal care`, `Pets`, `Entertainment`, `Travel`, `Giving`, `Family support`, `Taxes`, `Fees`, `Other expense`.

There are no Savings, Credit card payment, or Debt payment expense categories; owned-account movements are transfers. Loan interest may use Fees. Category splitting and principal/interest splits are deferred.

Shared custom categories are visible to members. Private custom categories are visible only to their owner. Shared transactions may use only shared/default categories. Private transactions may use shared/default categories or a private category owned by the same user. Archived categories remain on historical transactions and cannot be newly selected. Names and aggregate counts must not leak private activity.

## FinancialTransaction semantics

Fields:

- `household_id`, `account_id`, `category_id`, nullable `transfer_id`
- `kind`: `income`, `expense`, `transfer`, `balance_adjustment`
- signed `account_impact` numeric(19,4)
- `status`: `pending` or `posted`
- `occurred_on` Date, UTC timestamps, description, optional notes
- `idempotency_key` for creates
- `reversal_of_id` and `replacement_for_id`
- timestamps

Sign invariant:

- Positive impact increases normalized balance.
- Negative impact decreases normalized balance.
- Income is positive; expense is negative.
- Transfer source is negative and destination positive.
- Balance adjustment may be either sign with a required reason.

Pending state exposes `pending_impact` but does not affect reports. Define:

```text
posted_balance = opening_balance + sum(posted impacts)
pending_impact = sum(pending impacts)
projected_balance = posted_balance + pending_impact
```

Pending transactions may be edited/deleted directly and become immutable when posted. Posted transactions cannot be directly updated or hard-deleted. A correction atomically creates a posted reversal with opposite impact and a posted replacement with corrected values. A transaction can be reversed only once, protected by a unique partial index/equivalent constraint. Original, reversal, and replacement remain auditable; their signed impacts naturally cancel. Reversal records cannot be casually edited.

Correcting/canceling a posted transfer reverses both original legs atomically, then creates a new equal-and-opposite pair when corrected. Pending transfers may be edited/deleted atomically.

## Transfers

A Transfer aggregate/service accepts source account, destination account, positive amount, household, currency, and idempotency key. It requires active same-household same-currency accounts and rejects equal accounts, cross-household accounts, archived accounts, shared/private combinations, private accounts with different owners, and non-positive amounts.

Allowed:

- shared to shared
- private to private when both accounts belong to the same user

Rejected:

- shared to private
- private to shared
- private accounts with different owners
- cross-household accounts
- different currencies

The service locks both accounts in deterministic ID order, validates the pair, and creates/updates/reverses both legs in one database transaction. Direct transaction endpoints reject transfer-kind creation or transfer-leg mutation.

## Deterministic overview and privacy scopes

Rails calculates authorized values using posted records only:

- total assets: positive normalized asset balances
- total liabilities: positive amount owed from liability balances
- net worth: assets minus liabilities
- income: positive posted income impacts for the period
- expenses: absolute posted expense impacts for the period
- cash flow: income minus expenses
- account balances and category totals
- transfers and balance adjustments excluded from income/expense
- pending records excluded from income, expenses, cash flow, and net worth

Overview returns explicit scopes:

- `shared`: shared household accounts and transactions only
- `private`: authenticated user's private accounts and transactions only
- `combined`: shared plus the authenticated user's private records

Another member's private values never appear in totals, counts, category summaries, recent activity, net worth, income, expenses, or cash flow. A combined user-specific total must not be labeled universal household total. AI is not involved.

## API proposal

All endpoints are under `/api/v1/households/:household_id/...` and load through membership and account privacy scope:

- `GET/POST /accounts`
- `GET/PATCH /accounts/:id`
- `POST /accounts/:id/archive`
- `GET/POST /categories`
- `PATCH /categories/:id`
- `POST /categories/:id/archive`
- `GET/POST /transactions`
- `GET/PATCH /transactions/:id` for pending only
- `POST /transactions/:id/post`
- `POST /transactions/:id/reverse`
- `GET/POST /transfers`
- `GET/PATCH /transfers/:id` through Transfer service
- `POST /transfers/:id/reverse`
- `GET /overview?scope=shared|private|combined&from=YYYY-MM-DD&to=YYYY-MM-DD`

Create endpoints accept a client idempotency key. Repeating the same key within household and operation scope returns the original result without duplicate records. Future bank imports will require provider, connection, external account, and external transaction identifiers; none are implemented now.

## Database integrity and indexes

Use foreign keys and household-consistency constraints for all parents. Add checks for enum values, currency equality to household base currency, numeric non-null/precision, sign/kind/category combinations, private-owner requirements, and transfer positivity. Add composite membership references where needed to prove private owners belong to the household.

Indexes include:

- `(account_id, status, occurred_on)`
- `(household_id, occurred_on)`
- `(category_id, occurred_on)`
- transfer identity and linked transaction IDs
- reversal and replacement relationships
- private-owner queries
- unique `(household_id, operation, idempotency_key)`
- partial unique reversal protection

All balance mutations run in transactions. Account and transfer rows lock with `FOR UPDATE`; transfer locks use deterministic account ordering. Overview reads use a consistent database snapshot and never a mutable balance cache.

## Deferred scope and migration trigger

Defer bank connections/imports, recurring transactions, budgets, debt payoff plans, investment holdings/prices/cost basis/gains, live exchange rates, receipts, AI, split transactions, and cross-currency support.

Reconsider migration to double-entry ledger entries when split transactions, principal/interest allocation, transfer fees, cross-currency transfers, bank reconciliation, securities, multi-leg imports, or formal accounting exports are approved.

## Test strategy

Add model/service/request coverage for sign conventions, asset/liability behavior, credit-card payments, transfer equality/rollback/direct-leg rejection, pending/posted/projected balances, posted reversal/replacement and transfer correction, single-reversal protection, immutable opening balances, default provisioning, category privacy/archive behavior, private/shared transfer rejection, shared/private/combined overviews, idempotent retries, archived accounts/categories, decimal strings/no Float, invalid currencies, concurrent locking, and cross-household 404.

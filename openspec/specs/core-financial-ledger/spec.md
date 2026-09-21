# core-financial-ledger Specification

## Purpose
Define the household-scoped core financial ledger, deterministic balances, privacy boundaries, and correction/transfer invariants for the DailyLoaf MVP.
## Requirements
### Requirement: Define household-owned accounts and normalized balances

The domain SHALL define `Account` with types `cash`, `checking`, `savings`, `credit_card`, `loan`, `investment`, `other_asset`, and `other_liability`; household, name, account type, base currency, immutable opening balance/date, shared/private visibility, private owner, and archived timestamp. Positive balance is value owned; negative balance is amount owed. Posted balance SHALL equal immutable opening balance plus posted signed impacts, without a mutable authoritative current balance.

#### Scenario: Calculate posted and projected balances

- **GIVEN** an account has opening, posted, and pending impacts
- **WHEN** Rails calculates balances
- **THEN** `posted_balance` excludes pending impacts
- **AND** `pending_impact` sums pending impacts
- **AND** `projected_balance` equals posted balance plus pending impact

### Requirement: Use signed FinancialTransaction records and a Transfer boundary

The MVP SHALL use `FinancialTransaction` records with signed `account_impact` and a `Transfer` aggregate/service. Positive impact increases an account; negative impact decreases it. Income is positive, expense negative, transfer source negative, transfer destination positive, and balance adjustment may use either sign. A transfer SHALL create exactly two linked equal/opposite records.

#### Scenario: Prevent direct transfer-leg mutation

- **GIVEN** a transfer-linked transaction exists
- **WHEN** a client calls an ordinary transaction create/update/delete endpoint for that leg
- **THEN** the API rejects the request
- **AND** transfer services remain the only mutation boundary

### Requirement: Enforce atomic transfers and account privacy

Transfer services SHALL lock both accounts in deterministic order, validate same household/base currency/allowed visibility, and mutate both legs in one transaction. Shared-to-shared and same-owner private-to-private transfers are allowed. Shared/private, different-private-owner, cross-household, archived, equal-account, and different-currency transfers are rejected. Equal/opposite consistency SHALL be enforced by services, transactions, locks, validation, API restrictions, and tests rather than an ordinary cross-row CHECK constraint.

#### Scenario: Roll back a failed transfer pair

- **GIVEN** a valid source and destination account
- **WHEN** either transfer leg cannot be persisted
- **THEN** neither leg nor aggregate remains committed
- **AND** no balance is duplicated or lost

### Requirement: Define categories and default provisioning

Categories SHALL be household-owned with income/expense kind, shared/default or private visibility, optional private owner, and archived state. Every household SHALL receive the exact approved default category set without duplicates. Shared transactions may use shared/default categories; private transactions may use shared/default or the same user's private category. Archived categories remain historical and cannot be selected for new transactions.

#### Scenario: Provision and archive categories safely

- **GIVEN** a household is created or an existing household is backfilled
- **WHEN** default categories are provisioned more than once
- **THEN** each default exists once per household and kind/name
- **AND** archiving a used category preserves historical labels but rejects new assignment

### Requirement: Define transaction lifecycle and posted corrections

Financial transactions SHALL support income, expense, transfer, and balance adjustment; pending/posted status; `occurred_on` Date; UTC timestamps; description/notes; categories; and idempotency keys. Pending transactions may be edited/deleted and become immutable when posted. Posted corrections SHALL atomically create one posted opposite-impact reversal and one posted replacement linked by `reversal_of_id`/`replacement_for_id`; direct update/hard-delete is prohibited. A transaction SHALL be reversed at most once. Posted transfer correction SHALL reverse both legs atomically and create a new pair when corrected.

#### Scenario: Correct a posted transaction

- **GIVEN** a posted expense exists
- **WHEN** an authorized correction is submitted
- **THEN** the original remains available
- **AND** one posted reversal and one posted replacement are created atomically
- **AND** their signed impacts produce the corrected net balance
- **AND** a second reversal is rejected

### Requirement: Enforce base-currency precision and idempotency

MVP account and transfer currencies SHALL equal the household base currency. Monetary storage SHALL use `numeric(19,4)`, exchange rates `numeric(20,10)` for future use, Rails calculations `BigDecimal`, `BigDecimal::ROUND_HALF_EVEN` when rounding is later needed, and JSON decimal strings. Client idempotency keys SHALL be unique per household and operation scope; an identical retry SHALL return the original result, while reuse with different parameters SHALL be rejected. No Float or live exchange-rate provider is allowed.

#### Scenario: Retry a create safely

- **GIVEN** a client submits a create request with an idempotency key
- **WHEN** it repeats the same request with that key
- **THEN** the original result is returned
- **AND** no duplicate account-affecting record is created

### Requirement: Calculate privacy-scoped deterministic overviews

Rails SHALL calculate account balances, assets, liabilities, net worth, income, expenses, cash flow, category totals, and recent activity from authorized posted records. Transfers and adjustments are excluded from income/expense; pending records are excluded from reports. Overview SHALL expose `shared`, `private`, and `combined` scopes. Another member's private values SHALL appear in none of the viewer's totals, counts, categories, recent activity, net worth, income, expenses, or cash flow. AI SHALL not calculate or override values.

#### Scenario: Return explicit overview scopes

- **GIVEN** shared records and another member's private records exist
- **WHEN** the authenticated member requests shared, private, and combined overview scopes
- **THEN** shared includes shared records only
- **AND** private includes the authenticated user's private records only
- **AND** combined includes shared plus the authenticated user's private records
- **AND** another member's private records are excluded from all scopes

### Requirement: Provide versioned household-scoped financial APIs

The API SHALL provide membership- and privacy-scoped versioned endpoints for accounts, categories, transactions, transfers, and overview under `/api/v1/households/:household_id/...`. It SHALL expose decimal strings and return authenticated cross-household access as `404`. No frontend financial UI is included.

#### Scenario: Isolate financial resources

- **GIVEN** a member belongs to household A and a resource belongs to household B
- **WHEN** the member requests the resource or overview
- **THEN** Rails returns `404 Not Found`
- **AND** it does not disclose private or cross-household data

### Requirement: Preserve financial integrity and defer advanced features

The schema SHALL enforce foreign keys, household consistency, enum/currency/amount/sign checks, private-owner membership, transfer constraints, reversal/replacement relationships, privacy ownership indexes, and idempotency uniqueness. Account-affecting mutations SHALL use database transactions and row locks. Bank imports, recurring transactions, budgets, debt plans, investment holdings, live rates, receipts, AI, split transactions, and cross-currency support SHALL remain deferred.

#### Scenario: Reject invalid financial combinations

- **GIVEN** an invalid sign/category, private owner, currency, archived account, transfer pair, or duplicate idempotency key
- **WHEN** the operation is submitted
- **THEN** validation or database constraints reject it
- **AND** no partial account-affecting state is committed

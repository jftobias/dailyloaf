# debt-management Specification Delta

## ADDED Requirements

### Requirement: Attach debt metadata to liability accounts without duplicating balances

The system SHALL provide a `DebtProfile` attached one-to-one to a household
liability account. The account's immutable opening balance plus signed posted
impacts SHALL remain the sole authoritative balance; the profile SHALL NOT
store any balance column. The profile SHALL store optional `creditor_name`,
required non-negative `minimum_payment`, required non-negative
`annual_interest_rate` expressed as an exact-decimal percentage, optional
non-negative `planned_monthly_payment`, optional `payment_due_day` constrained
to 1–31, optional positive `original_principal`, optional `opened_on` and
`maturity_on` dates, optional `notes`, and timestamps. Monetary values SHALL
use `numeric(19,4)` storage and decimal-string JSON; rates SHALL use an
appropriately constrained exact decimal type; no Float SHALL be used.

#### Scenario: Reject a profile on an asset account

- **GIVEN** a household asset account
- **WHEN** a member creates a debt profile for it
- **THEN** the API rejects the request with a validation error
- **AND** no profile is persisted

#### Scenario: Isolate profiles per household and visibility

- **GIVEN** a debt profile on another household's account, or on a private
  account owned by another member
- **WHEN** a member requests or mutates that profile
- **THEN** the API responds 404 without revealing existence
- **AND** shared and same-owner private accounts remain accessible

#### Scenario: Preserve the profile when the account is archived

- **GIVEN** a liability account with a debt profile
- **WHEN** the account is archived
- **THEN** the profile remains readable for history
- **AND** the account is excluded from new payment destinations

### Requirement: Pay debts through the existing transfer aggregate

Debt payments SHALL be recorded only through the existing `Transfer` aggregate
and service: source SHALL be an active asset account and destination an active
liability account in the same household, currency, and allowed visibility.
Transfer creation SHALL remain atomic and idempotent, SHALL create exactly two
equal/opposite legs, and SHALL reuse existing reversal behavior. A debt payment
SHALL NOT be counted as income or expense anywhere in the system.

#### Scenario: Reduce debt with a transfer payment

- **GIVEN** an active asset account and a liability account with a posted
  negative balance
- **WHEN** the member posts a transfer from the asset to the liability account
- **THEN** the asset balance decreases and the liability balance increases by
  the same amount
- **AND** income and expense totals are unchanged

#### Scenario: Reverse a debt payment

- **GIVEN** a posted transfer paying a debt
- **WHEN** the member reverses the transfer
- **THEN** a posted reversal transfer restores both balances
- **AND** individual transfer legs remain immutable through ordinary
  transaction endpoints

### Requirement: Guard the transfer aggregate boundary

Every financial transaction belonging to a `Transfer` SHALL reject direct
mutation through transaction-level services and endpoints — update, delete,
post, reverse, and posted correction/replacement — with a stable
`transfer_leg_mutation` error. Transfer legs SHALL remain readable for
history. Creation, pending edits, and reversal SHALL occur only through
`TransferService` and the aggregate transfer endpoints. Aggregate reversal
SHALL create both opposite account effects in one transaction under
deterministic account locking, SHALL remain idempotent, SHALL roll back
entirely if either leg fails, and SHALL reject a second reversal. The UI
SHALL NOT expose mutation controls on transfer-leg records and SHALL direct
members to the transfer detail instead.

#### Scenario: Reject direct mutation of a transfer leg

- **GIVEN** a posted transfer with two transaction legs
- **WHEN** a member PATCHes, POSTs to `post` or `reverse`, or DELETEs either
  leg through the transactions API
- **THEN** each request fails with `transfer_leg_mutation`
- **AND** both account balances are unchanged
- **AND** a leg belonging to another household still responds 404

#### Scenario: Reverse the aggregate atomically

- **GIVEN** a posted transfer
- **WHEN** the member reverses it through the transfers endpoint
- **THEN** a reversal transfer with two opposite legs is created atomically
- **AND** both accounts return to their pre-transfer balances
- **AND** a second reversal attempt is rejected

#### Scenario: Roll back a failed reversal

- **GIVEN** a posted transfer whose reversal leg creation fails midway
- **WHEN** the reversal is attempted
- **THEN** no reversal transfer or partial leg persists
- **AND** both account balances are unchanged

### Requirement: Present money with currency-aware formatting

User-facing monetary values SHALL be rendered with the existing
currency-aware formatter, honoring the currency's standard fraction digits
(for COP, whole amounts such as `$ 34.162`). APIs and calculations SHALL
keep exact `numeric(19,4)` decimal strings; the full precision SHALL NOT be
exposed as normal financial UI on cards, tooltips, tables, chart axes, or
accessible chart summaries.

#### Scenario: Format a fractional projection amount

- **GIVEN** a projection whose exact interest total is `"34161.5496"` COP
- **WHEN** the payoff estimate is displayed in either locale
- **THEN** the UI shows the currency-formatted amount (for example
  `$ 34.162` in es-CO)
- **AND** the four-decimal string never appears on screen

### Requirement: Normalize liability opening balances at the service boundary

The account-creation API SHALL accept `opening_balance` as a non-negative
user-facing amount — the amount currently held for asset accounts and the
amount currently owed for liability accounts. `AccountService` SHALL convert
it to the canonical signed internal value for the selected account type
(negative for liabilities) before persistence, SHALL reject negative input
with a validation error, and the model SHALL enforce that a liability's
stored opening balance is never positive and an asset's is never negative.
Clients SHALL submit only the positive entered amount and SHALL NOT negate
client-side.

#### Scenario: Create a credit card from a positive owed amount

- **GIVEN** a member creates a `credit_card` account with opening amount
  `"500000"`
- **WHEN** the account is persisted
- **THEN** the stored opening balance is `-500000`
- **AND** the debt view presents `500000` owed, liabilities increase by
  `500000`, and net worth decreases by `500000`

#### Scenario: Preserve asset opening balances

- **GIVEN** a member creates a `checking` account with opening amount
  `"500000"`
- **WHEN** the account is persisted
- **THEN** the stored opening balance is `500000`
- **AND** assets and net worth increase by `500000`

#### Scenario: Reject a negative opening amount

- **GIVEN** any account type
- **WHEN** a client submits a negative `opening_balance`
- **THEN** the API rejects the request with a validation error
- **AND** no account is persisted

### Requirement: Offer credit-card limits with projected available credit

Credit-card accounts SHALL support an optional `credit_limit` stored as
`numeric(19,4)` on the account, constrained to positive values and to
`credit_card` account type only — attempts to set it on any other type SHALL
be rejected with a validation error. When a limit exists, the debt response
SHALL include `credit_limit`, `available_credit` computed as
`credit_limit - projected_debt_balance` (projected balance includes pending
impacts), `utilization_percentage` computed as
`projected_debt_balance / credit_limit * 100` with half-even rounding, and
`over_limit_amount`. All values SHALL be decimal strings computed with
BigDecimal; negative available credit SHALL be preserved rather than clamped.
Available credit SHALL be presented as borrowing capacity only and SHALL
NEVER contribute to net worth, total assets, income, cash flow, or any
financial total.

#### Scenario: Compute availability from the projected balance

- **GIVEN** a credit card with limit `"2000000"` and posted debt `"500000"`
- **WHEN** the debt is requested
- **THEN** available credit is `"1500000"` and utilization is `"25.00"`
- **AND** a pending `"100000"` card expense makes the projected debt
  `"600000"`, available credit `"1400000"`, and utilization `"30.00"`

#### Scenario: Over-limit state

- **GIVEN** a card whose projected debt exceeds its limit
- **WHEN** the debt is requested
- **THEN** available credit is negative and `over_limit_amount` is the
  exceeded amount

#### Scenario: Payments restore availability

- **GIVEN** a card with a limit and a posted transfer payment
- **WHEN** the payment posts and is later reversed through the aggregate
- **THEN** available credit rises on payment and returns to its prior value
  on reversal — atomically with both legs

#### Scenario: Reject a limit on a non-card liability

- **GIVEN** a `loan` or `other_liability` account
- **WHEN** a client sets `credit_limit`
- **THEN** the API rejects the request with a validation error

#### Scenario: Missing limit

- **GIVEN** a credit card without a configured limit
- **WHEN** the debt is requested
- **THEN** availability fields are absent or null and the card remains valid

#### Scenario: Availability excluded from financial totals

- **GIVEN** a card with a configured limit and available credit
- **WHEN** overview or analytics totals are computed
- **THEN** net worth, assets, income, and cash flow are identical to the same
  household without a configured limit

### Requirement: Make card and debt information editable and removable

The debt detail page SHALL expose clearly labeled actions: edit card
information (account name, credit limit, and debt-profile metadata), record
payment, and archive card. Editing SHALL preserve the immutable
opening-balance rule after financial activity. Removing a debt profile SHALL
be a clearly explained destructive action that deletes only debt metadata and
projections — the account, credit limit, and transaction history SHALL
remain. Archival SHALL be the user-facing removal mechanism for cards with
history: archived cards SHALL be excluded from new transaction/payment forms
while preserving transactions, transfers, analysis, and limit metadata.

#### Scenario: Edit card information

- **GIVEN** a credit card with a limit and debt profile
- **WHEN** the member opens the edit form
- **THEN** the account name, credit limit, rate, payments, due day, creditor,
  and notes are editable with clear labels
- **AND** saving updates account and profile fields without touching the
  opening balance

#### Scenario: Remove debt configuration

- **GIVEN** a card with a debt profile and posted transactions
- **WHEN** the member confirms removing the debt configuration
- **THEN** the profile is deleted, the account and its history remain
  readable, and the configured credit limit is preserved

#### Scenario: Archive a card

- **GIVEN** a credit card with posted activity
- **WHEN** the member confirms archiving
- **THEN** the card is marked archived, disappears from payment and
  transaction source options, and keeps its history, limit, and analysis
  data

### Requirement: Use localized money inputs

Every user-facing monetary input SHALL use the shared localized money
component: it SHALL display the household currency, accept keyboard entry,
paste, deletion, and replacement, support the active locale's decimal
separator (`es` comma, `en` period) while treating the opposite separator as
grouping, keep the canonical value as a decimal string without Float
conversion, use `inputMode="decimal"`, associate currency/hint/error text
accessibly, and format grouping on blur without cursor jumps — never showing
a raw stored format such as `0.0000`.

#### Scenario: Enter a COP amount in Spanish

- **GIVEN** a member using `es` on a COP household
- **WHEN** the member types `500000` or `1.500.000` in a money field
- **THEN** the canonical value is `"500000"` or `"1500000"`
- **AND** the field shows `COP` context and groups digits on blur

#### Scenario: Enter a decimal amount in English

- **GIVEN** a member using `en`
- **WHEN** the member types `1,234.56` in a money field
- **THEN** the canonical value is `"1234.56"`
- **AND** the API payload preserves the exact decimal string

### Requirement: Keep product copy free of implementation details

User-facing copy SHALL NOT mention implementation details such as Rails,
service objects, authoritative-database wording, or decimal storage. Internal
architecture language SHALL be replaced with user-focused explanations.

#### Scenario: No internal phrases render

- **GIVEN** any page in either locale
- **WHEN** the UI renders
- **THEN** phrases such as "authoritative in Rails" / "autoritativos en
  Rails" do not appear in the document or the dictionaries

### Requirement: Estimate payoff with a documented deterministic projection

The system SHALL compute a payoff estimate in Rails from the current posted
debt balance, the annual interest rate, and the assumed monthly payment —
`planned_monthly_payment` when present, otherwise `minimum_payment` — using a
documented declining-balance monthly convention, half-even monetary rounding,
a maximum horizon of 600 months, and the household time zone for dates. The
response SHALL return the current balance, assumed payment, estimated payoff
date, estimated months, estimated total interest, estimated total paid, and
whether the payment is insufficient to amortize, clearly labelled as an
estimate.

#### Scenario: Amortize a normal debt

- **GIVEN** a debt with positive balance, positive rate, and a payment above
  monthly interest
- **WHEN** the projection is requested
- **THEN** the API returns a finite month count and payoff date
- **AND** total paid equals balance plus total interest within rounding

#### Scenario: Support zero-interest debt

- **GIVEN** a debt with a zero annual rate and a positive payment
- **WHEN** the projection is requested
- **THEN** months equal the ceiling of balance divided by payment
- **AND** total interest is zero

#### Scenario: Detect non-amortizing payments

- **GIVEN** a payment not exceeding first-month interest, or a zero payment on
  a positive balance
- **WHEN** the projection is requested
- **THEN** `amortizing` is false and payoff fields are null
- **AND** the simulation never loops beyond the documented horizon

### Requirement: Provide a localized debt interface

The UI SHALL add `/app/debts` and `/app/debts/[accountId]` pages and a
Debts/Deudas navigation entry. The list SHALL show account name, posted
balance, projected balance when pending impacts exist, rate, minimum and
planned payments, due day, estimated payoff date, progress versus
`original_principal` when available, shared/private status, and archived
state. The detail page SHALL offer profile create/edit, a payment action
backed by the transfer API, the payoff projection, and progress
visualization, plus an empty state directing users to create or configure a
liability account. All strings SHALL resolve through the en/es dictionaries.

#### Scenario: Configure a debt profile in Spanish

- **GIVEN** a member using the `es` locale with a liability account
- **WHEN** the member opens the debt page and saves a profile
- **THEN** all labels, validation, and errors render in Spanish
- **AND** the profile persists and the list reflects it

#### Scenario: Exclude archived debts from payments

- **GIVEN** an archived liability account
- **WHEN** the member opens the payment form for any debt
- **THEN** the archived account is not offered as a payment destination

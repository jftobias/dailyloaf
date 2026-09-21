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

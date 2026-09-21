# Financial record lifecycle UI

## ADDED Requirements

### Requirement: Inspect financial records semantically

The frontend SHALL provide `/app/transactions/:transaction_id` and `/app/transfers/:transfer_id` detail routes. Transaction details SHALL show semantic account, type, category, positive amount, date, description, notes, status, useful timestamps, and correction relationships without exposing raw signed-impact terminology or database IDs. Transfers SHALL display both account effects as one aggregate event.

#### Scenario: View a corrected transaction

- **GIVEN** a transaction has an original, reversal, and replacement relationship
- **WHEN** the member opens its detail route
- **THEN** the UI labels the correction chain clearly
- **AND** does not present the transfer/correction legs as independently editable records

### Requirement: Correct transactions through the ledger contract

Pending transactions SHALL support permitted field edits, posting, and deletion. Posted transactions SHALL never be silently updated or hard-deleted. Posted correction SHALL show original values, explain preservation, require confirmation, submit reversal/replacement through the API, and display the resulting records. Reversal SHALL be offered at most once.

#### Scenario: Correct a posted expense

- **GIVEN** a posted expense exists
- **WHEN** the member confirms corrected values
- **THEN** the UI submits the existing correction contract
- **AND** displays original, reversal, and replacement states
- **AND** a repeated reversal attempt is unavailable or rendered as completed

### Requirement: Manage transfer lifecycle atomically

The transfer detail UI SHALL allow only backend-supported pending edits, posting, and aggregate reversal. It SHALL submit transfer requests only through transfer endpoints and SHALL never update or delete individual transaction legs.

#### Scenario: Reverse a posted transfer

- **GIVEN** a posted transfer has two linked account effects
- **WHEN** the member confirms reversal
- **THEN** one aggregate reversal request is sent
- **AND** both account balances update together
- **AND** no partial-leg control is rendered

### Requirement: Archive financial records safely

Account detail SHALL show activity and posted/pending/projected balances, filters, historical activity, and an accessible archive confirmation. Category management SHALL archive supported custom categories, exclude them from new forms, and retain them on historical records.

#### Scenario: Archive and preserve history

- **GIVEN** an account or category has financial history
- **WHEN** the member confirms archive
- **THEN** new account/category selection excludes it
- **AND** historical detail continues to display it with archived status

### Requirement: Handle lifecycle errors accessibly

Lifecycle UI SHALL use typed API errors and accessible confirmation/status components. It SHALL route `401` to login, show generic `404` states, explain `409` conflicts with reload/retry guidance, map `422` validation errors, and show recoverable network failures. It SHALL keep credentials, CSRF, decimal strings, and idempotency behavior intact.

#### Scenario: Handle a stale correction

- **GIVEN** another browser changed the record before confirmation
- **WHEN** the correction returns `409` or `422`
- **THEN** the UI does not claim success
- **AND** shows an actionable conflict message without exposing another household's data

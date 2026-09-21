# Core financial management UI

## ADDED Requirements

### Requirement: Render a privacy-scoped financial overview

The authenticated `/app` route SHALL render the active household, current-month overview, net worth, assets, liabilities, income, expenses, cash flow, account balances, recent transactions, and useful empty states using Rails-provided decimal strings. It SHALL support only legitimate `shared`, `private`, and `combined` scopes.

#### Scenario: Show an empty household

- **GIVEN** an authenticated household has no accounts
- **WHEN** the member opens `/app`
- **THEN** the UI shows an actionable empty state linking to account creation
- **AND** it does not render decorative fake charts or invented totals

#### Scenario: Preserve privacy scopes

- **GIVEN** shared and private records exist
- **WHEN** the member switches between supported overview scopes
- **THEN** the UI requests the explicit scope from Rails
- **AND** it does not render another member's private values
- **AND** a combined user-specific result is not labeled a universal household total

### Requirement: Manage accounts without client balance authority

The UI SHALL provide account list, creation, detail, and archive-aware states. It SHALL display account type, asset/liability grouping, currency, opening balance, posted balance, pending balance, projected balance, visibility, and archived status from Rails responses. Opening balances SHALL be submitted as decimal strings and the browser SHALL not calculate authoritative balances.

#### Scenario: Create an initial checking account

- **GIVEN** an authenticated member submits a valid checking account and decimal opening balance
- **WHEN** the request succeeds
- **THEN** the UI navigates to the account/overview view
- **AND** displays the Rails-returned balances

### Requirement: Record income and expenses with centralized sign mapping

The UI SHALL provide `/app/transactions` and `/app/transactions/new` for income and expense records with account, visibility-valid category, positive user-facing amount, date, description, pending/posted state, optional notes, and one idempotency key per submission attempt. A centralized mapping SHALL translate positive input to the API's signed `account_impact` contract.

#### Scenario: Record an expense

- **GIVEN** a member enters a positive expense amount and selects a valid account/category
- **WHEN** the form is submitted
- **THEN** the client sends one negative signed account impact as a decimal string
- **AND** Rails-returned balances and overview values are refreshed
- **AND** duplicate retry does not create another record

### Requirement: Manage compatible transfers through one request

The UI SHALL provide `/app/transfers/new` with source and destination account selection. It SHALL reject the same account, show only compatible accounts, prevent shared/private and different-private-owner combinations, submit one transfer request with a reused idempotency key, and never create transfer legs through transaction endpoints.

#### Scenario: Transfer between accounts

- **GIVEN** two eligible same-currency accounts are selected
- **WHEN** the member submits a transfer
- **THEN** the client sends one transfer request
- **AND** both Rails-returned account balances update
- **AND** the transfer is not presented as income or expense

### Requirement: Manage household categories within API rules

The UI SHALL provide `/app/settings/categories` grouped by income and expenses, identify defaults/custom/private categories, allow authorized private custom-category creation and supported archive actions, and not offer prohibited operations.

#### Scenario: Filter categories for a transaction

- **GIVEN** income, expense, shared, private, and archived categories exist
- **WHEN** a member selects a transaction kind and account
- **THEN** only active categories valid for that kind and account privacy are selectable
- **AND** private category names are not exposed to unauthorized members

### Requirement: Handle authenticated responsive financial workflows

The UI SHALL use existing route guards, credentialed typed API methods, CSRF behavior, Rails error envelopes, loading/error states, and responsive accessible navigation. It SHALL handle 401 by refreshing auth state and routing to login, 404 without revealing ownership, and 409/422 with actionable validation messages. It SHALL not store auth tokens in browser storage or create horizontal overflow.

#### Scenario: Persist and protect the workflow

- **GIVEN** a member creates accounts, income, expenses, and a transfer
- **WHEN** the member reloads, signs out, and signs back in
- **THEN** the persisted Rails results reappear after login
- **AND** protected routes redirect to login while signed out
- **AND** desktop, tablet, and mobile layouts remain usable

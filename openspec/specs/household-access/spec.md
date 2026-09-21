# household-access Specification

## Purpose
TBD - created by archiving change define-household-access. Update Purpose after archive.
## Requirements
### Requirement: Authenticate with native Rails sessions

The API SHALL use Rails native authentication architecture adapted for JSON: `User` with `has_secure_password`, persisted database-revocable `Session` records, `Current.user`, `Current.session`, and a secure HttpOnly host-only session cookie. It SHALL NOT use Devise or JWT.

#### Scenario: Register a user and household atomically

- **GIVEN** valid registration attributes
- **WHEN** `POST /api/v1/auth/register` succeeds
- **THEN** the system creates exactly one `User`, `Household`, owner `HouseholdMembership`, and authenticated `Session`
- **AND** it sets an HttpOnly session cookie
- **AND** a failure in any step leaves none of the four records committed

#### Scenario: Authenticate without account enumeration

- **GIVEN** an email/password authentication request
- **WHEN** the credentials are invalid or the email is unknown
- **THEN** the API returns the same generic JSON authentication error
- **AND** it does not reveal whether the email exists

### Requirement: Expose versioned JSON authentication endpoints

The API SHALL provide `POST /api/v1/auth/register`, `POST /api/v1/auth/session`, `DELETE /api/v1/auth/session`, `GET /api/v1/auth/me`, and `GET /api/v1/auth/csrf` with stable JSON success and error envelopes.

#### Scenario: Read and revoke the current session

- **GIVEN** a valid session cookie
- **WHEN** the client calls `GET /api/v1/auth/me`
- **THEN** the API returns the authenticated user JSON
- **WHEN** the client calls `DELETE /api/v1/auth/session`
- **THEN** the current persisted session is revoked
- **AND** subsequent `/auth/me` access is unauthenticated

### Requirement: Protect cookie-authenticated mutations with CSRF

Rails CSRF protection SHALL remain enabled for cookie-authenticated API requests. `GET /api/v1/auth/csrf` SHALL return a valid token. `POST`, `PATCH`, `PUT`, and `DELETE` requests SHALL require that token in `X-CSRF-Token`; safe `GET` and `HEAD` requests SHALL not mutate state.

#### Scenario: Reject a mutation without a valid CSRF token

- **GIVEN** an authenticated session cookie
- **WHEN** the client sends a state-changing request without a valid `X-CSRF-Token`
- **THEN** the API rejects it with the standard JSON CSRF error
- **AND** the mutation does not occur

#### Scenario: Accept a mutation with the CSRF token

- **GIVEN** an authenticated session cookie and a token returned by `/api/v1/auth/csrf`
- **WHEN** the client sends the token in `X-CSRF-Token`
- **THEN** the valid state-changing request is processed

### Requirement: Configure secure host-only cookies and explicit CORS

The session cookie SHALL be HttpOnly, host-only, and `SameSite=Lax`. Development MAY use `Secure=false` only over local HTTP; production SHALL use `Secure=true` over HTTPS. CORS SHALL allow credentials, explicitly allow `X-CSRF-Token`, accept comma-separated `CORS_ORIGINS`, and reject wildcard origins. The Next.js client SHALL send `credentials: "include"`.

#### Scenario: Allow and reject configured browser origins

- **GIVEN** `CORS_ORIGINS` contains explicit origins
- **WHEN** a request comes from a configured origin
- **THEN** the API returns the matching `Access-Control-Allow-Origin` and credentials headers
- **AND** when a request comes from an unconfigured or wildcard origin, the API does not grant CORS access

### Requirement: Model household ownership and membership

The domain SHALL define `User`, `Household`, `HouseholdMembership`, and `Session`. Membership roles SHALL be exactly `owner` or `member`. A user MAY belong to multiple households. The UI MAY automatically select the only household and SHALL show a selector for multiple memberships, but the selected household ID SHALL never authorize a request.

#### Scenario: Support multiple memberships

- **GIVEN** a user has memberships in households A and B
- **WHEN** the frontend selects household B
- **THEN** Rails authorizes requests through the authenticated user's membership in B
- **AND** membership in A does not grant access to unrelated resources

#### Scenario: Prevent duplicate memberships

- **GIVEN** a user already belongs to a household
- **WHEN** another membership is created for the same user and household
- **THEN** the database rejects it through a unique composite index
- **AND** foreign keys and role constraints remain enforced

### Requirement: Scope household resources and return 404 cross-household

Every household-owned API resource SHALL use an explicit `/api/v1/households/:household_id/...` route and SHALL be loaded through the authenticated user's membership scope. Controllers SHALL NOT load resources globally and authorize them afterward. Authenticated access to another household SHALL return `404 Not Found`, matching missing resources.

#### Scenario: Isolate another household

- **GIVEN** an authenticated user belongs to household A but not household B
- **WHEN** the user requests household B or one of its resources
- **THEN** the API returns `404 Not Found`
- **AND** it does not disclose whether the household or resource exists

### Requirement: Enforce household roles and final-owner protection

Owners SHALL be able to update household details, list memberships, remove members, and promote or demote members subject to final-owner protection. Members SHALL manage shared household data and only their own private data. Household ownership SHALL not grant access to another member's private financial records. The final owner SHALL not leave, be removed, or be demoted; enforcement SHALL use domain logic and database-safe transactions.

#### Scenario: Protect the final owner

- **GIVEN** a household has exactly one owner
- **WHEN** that owner attempts to leave, is removed, or is demoted
- **THEN** the operation fails
- **AND** the household retains an owner

#### Scenario: Preserve private-record boundaries

- **GIVEN** two members share a household and a future record is private
- **WHEN** the non-owner or household owner requests it
- **THEN** the record is not visible
- **AND** a shared record remains visible to household members

### Requirement: Preserve exact financial data conventions

Future financial data SHALL use PostgreSQL `numeric(19,4)` for monetary amounts and `numeric(20,10)` for exchange rates. Currency codes SHALL be uppercase ISO 4217 strings stored separately. Rails SHALL calculate with `BigDecimal`; `Float` SHALL NOT be used for financial values. JSON monetary amounts and exchange rates SHALL be decimal strings, never JSON numbers, and AI SHALL never calculate authoritative financial values.

#### Scenario: Serialize future financial values safely

- **GIVEN** a future financial response contains an amount, currency code, and exchange rate
- **WHEN** the API serializes the response
- **THEN** amounts and rates are strings
- **AND** the currency code is a separate uppercase ISO 4217 field

### Requirement: Defer undefined identity flows

Email invitations, invitation expiration, ownership transfer, social login, external OIDC, and MFA SHALL remain deferred until separately approved because they are not defined in the DailyLoaf blueprint.

#### Scenario: Avoid inventing deferred behavior

- **GIVEN** a deferred identity workflow is requested
- **WHEN** implementation reaches it
- **THEN** the team creates a separate approved OpenSpec change
- **AND** this change does not implement it

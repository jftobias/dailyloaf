# Design: Household access and authorization

## Blueprint findings

The DailyLoaf blueprint requires server-side household membership checks, prohibits identifier-based cross-household access, requires authorization tests, and establishes exact-decimal money rules. It does not prescribe an authentication mechanism, token format, session model, invitation flow, or ownership-transfer flow. This implementation resolves those decisions with Rails 8 native authentication architecture and defers the explicitly deferred flows.

## Identity and authentication

Use the Rails 8 native authentication generator and architecture as the starting point, adapted for an API-only JSON application. Inspect generated output and retain only the API-appropriate models, concerns, mailer foundations, session behavior, and supporting pieces; do not retain generated HTML forms or views.

The application uses:

- `User` with `has_secure_password`.
- A persisted `Session` model with database-revocable records.
- Rails `Current.user` and `Current.session` for request identity.
- A secure, HttpOnly, host-only session cookie.
- JSON authentication controllers and consistent JSON errors.
- No Devise and no JWT.

Authentication must not reveal whether an email address exists during login or future password-recovery flows. Authentication failures use a generic JSON error structure.

## Cookie, CORS, and CSRF

The session cookie is host-only: omit `Domain`, use `HttpOnly`, and use `SameSite=Lax`.

- Development: `Secure: false` because local development uses HTTP.
- Production: `Secure: true`; HTTPS is required.
- Intended production same-site hosts are `app.dailyloaf.example` and `api.dailyloaf.example`.
- Do not use `SameSite=None` unless a later deployment decision requires truly cross-site domains.

`CORS_ORIGINS` remains an explicit comma-separated allowlist. Rails allows credentials, permits the `X-CSRF-Token` request header, and never permits wildcard origins. The Next.js client uses `credentials: "include"` on authenticated API requests.

Rails CSRF protection remains enabled for cookie-authenticated API requests. `GET /api/v1/auth/csrf` returns a valid token. State-changing `POST`, `PATCH`, `PUT`, and `DELETE` requests require `X-CSRF-Token`; safe `GET` and `HEAD` requests do not mutate state. Missing or invalid tokens use one consistent JSON error response. CSRF is not disabled globally.

## Versioned API surface

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/session`
- `DELETE /api/v1/auth/session`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/csrf`
- `GET /api/v1/households`
- `GET /api/v1/households/:household_id`
- `GET /api/v1/households/:household_id/memberships`
- Membership-management mutations are authorized for owners and are part of this implementation where required by the approved spec.

All errors use a stable JSON envelope such as `{ "error": { "code": "...", "message": "...", "details": {} } }`; `details` is optional and must not contain secrets or account-existence information.

## Data model and registration transaction

### User

- `id`, normalized unique `email`, `password_digest`, and timestamps.
- No household foreign key: a user may belong to multiple households.

### Household

- `id`, display `name`, uppercase ISO 4217 `currency_code`, and timestamps.
- The initial supported currency is `COP` per the blueprint.

### HouseholdMembership

- `id`, `user_id`, `household_id`, `role`, and timestamps.
- `role` is exactly `owner` or `member`.
- Unique composite index on `[user_id, household_id]` prevents duplicates.
- Foreign keys to both parent tables and a database check constraint for valid roles are required.
- Indexes support lookups by `user_id`, `household_id`, and the composite authorization query.

### Session

- `id`, `user_id` foreign key, securely generated token digest, expiry/revocation timestamps as appropriate, and timestamps.
- Store only a digest of the session token; the raw token exists only in the host-only cookie and request memory.
- Lookup loads the user through the persisted session and rejects expired or revoked sessions.

Registration is an atomic transaction that creates, in order, `User`, `Household`, owner `HouseholdMembership`, and authenticated `Session`. Any failure rolls back all four records. Login creates a new persisted session; logout revokes/deletes only the current persisted session. Session cookie rotation is required on authentication to prevent fixation.

## Household authorization

Household routes identify the household explicitly, for example `/api/v1/households/:household_id/...`. The frontend may save the last selected household ID locally for convenience, but that value is never an authorization mechanism.

When a user has exactly one membership, the API/UI may automatically select it. When a user has multiple memberships, the frontend shows a household selector and sends the selected ID explicitly. Rails validates membership for every household-scoped request.

Every household-owned resource is loaded through the authenticated user's membership scope. Controllers must never load household resources globally and authorize them afterward. Authenticated cross-household access returns **404 Not Found**, matching missing resources and preventing household-existence disclosure. Unauthenticated requests return **401 Unauthorized**.

Owner permissions:

- Update household details.
- List memberships.
- Remove members.
- Promote or demote members, subject to final-owner protection.

Member permissions:

- Read and manage household-shared financial data.
- Read and manage only their own private financial data.

Household owners do not automatically gain access to another member's private financial records. Future shared records are visible to household members; future private records are visible only to their owner, who must also be a member. This contract is specified now without creating financial account or transaction models.

The final owner cannot leave, be removed, or be demoted. Enforce this in domain logic inside database-safe transactions using row locking or equivalent serialization so concurrent changes cannot leave a household ownerless.

Email invitations, invitation expiration, ownership transfer, social login, external OIDC, and MFA are deferred because they are not defined in the DailyLoaf blueprint.

## Money conventions

- Monetary amounts use PostgreSQL `numeric(19,4)`.
- Exchange rates use PostgreSQL `numeric(20,10)`.
- Currency codes are uppercase ISO 4217 strings stored separately from amounts.
- Rails calculations use `BigDecimal`; never use `Float` for financial values.
- JSON monetary amounts and exchange rates are decimal strings, never JSON numbers.
- Deterministic financial calculations belong in Rails domain logic. AI may explain a calculated snapshot later but never calculates or becomes the source of truth.

## Testing design

Request specs must cover registration, generic authentication errors, session cookie attributes, `/me`, logout revocation, CSRF token issuance, missing/invalid CSRF failures, allowed/rejected CORS origins, cross-household 404 isolation, and authenticated users with multiple household memberships. Model/service specs must cover password validation, persisted session revocation, duplicate membership rejection, role constraints, atomic registration rollback, membership management, private/shared visibility contracts, and final-owner protection under transactions. Browser validation must exercise the real Docker services and prove the session cookie, CSRF flow, logout behavior, and cross-household 404 response.

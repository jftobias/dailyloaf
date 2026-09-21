# Tasks: Define household access

- [x] Resolve authentication as Rails 8 native architecture: `has_secure_password`, persisted `Session`, `Current.user`, secure HttpOnly host-only cookie, and JSON controllers; do not use Devise or JWT.
- [x] Resolve development/production cookie, explicit CORS, credentials, and CSRF strategy.
- [x] Resolve 404 behavior for authenticated cross-household access and explicit active-household routing.
- [x] Resolve `numeric(19,4)` monetary amounts, `numeric(20,10)` exchange rates, ISO 4217 strings, BigDecimal calculations, and decimal-string JSON.
- [x] Document deferred invitations, ownership transfer, social login, external OIDC, and MFA.
- [x] Generate/inspect Rails authentication foundations and retain only API-appropriate pieces.
- [x] Add `User`, `Household`, `HouseholdMembership`, and `Session` migrations/models with foreign keys, role constraints, normalized identity uniqueness, and the composite duplicate-prevention index.
- [x] Implement atomic registration that creates the user, household, owner membership, and authenticated session.
- [x] Implement JSON authentication endpoints and generic account-safe errors.
- [x] Implement membership-scoped household loading and role-protected membership management.
- [x] Implement final-owner protection with database-safe transactions.
- [x] Implement CSRF token issuance and validation for cookie-authenticated mutations.
- [x] Add request/model specs for cookies, sessions, registration rollback, CSRF, CORS, multiple memberships, cross-household 404 isolation, and final-owner protection.
- [x] Update the Next.js client to send credentials and CSRF headers where needed; mutation UI remains deferred.
- [x] Run OpenSpec validation, RSpec, RuboCop, frontend lint/typecheck/build, Docker Compose config, and browser validation.
- [x] Defer executable private/shared financial-record policy specs until the first financial model is approved; the current change intentionally creates no financial records.

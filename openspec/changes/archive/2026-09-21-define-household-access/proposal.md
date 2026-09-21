# Proposal: Implement household access with native Rails authentication

## Why

DailyLoaf must establish authenticated identity and household privacy before financial resources are created. The approved design now selects Rails 8 native authentication architecture with persisted, database-revocable sessions and cookie/CSRF protections suitable for a JSON API.

## Scope

Implement the approved identity and household-access boundary only:

- Native Rails `has_secure_password` user authentication.
- Persisted sessions exposed through `Current.user` and `Current.session`.
- JSON authentication endpoints under `/api/v1/auth`.
- HttpOnly host-only cookie sessions, explicit credentialed CORS, and CSRF protection.
- `User`, `Household`, and `HouseholdMembership` with owner/member roles.
- Atomic registration and onboarding.
- Explicit household routes with membership-scoped loading and authenticated cross-household `404` responses.
- Owner membership management and final-owner protection.
- RSpec request/model coverage and Docker browser validation.

## Explicit non-goals

- Devise or JWT.
- HTML authentication forms or views from the Rails generator.
- Financial accounts, transactions, budgets, goals, bank integrations, AI, invitations, invitation expiration, ownership transfer, social login, OIDC, or MFA.

## Completion criteria

The change is complete only when the OpenSpec delta is valid, the API and browser tests pass, the session cookie and CSRF behavior are proven through Docker, cross-household access returns `404`, and all repository quality checks pass.

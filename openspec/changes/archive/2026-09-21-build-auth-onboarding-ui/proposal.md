# Proposal: Build authentication and onboarding UI

## Why

The Rails authentication and household-access boundary is implemented, but users have no browser workflow for registration, login, session recovery, or household selection. DailyLoaf needs a small accessible UI foundation before financial features are added.

## What Changes

- Add responsive `/register`, `/login`, and authenticated `/app` routes.
- Add one typed browser API client for cookie sessions, CSRF, and Rails JSON errors.
- Add client authentication state and UX redirects while keeping Rails as the security boundary.
- Add registration, login, logout, current-user, and household-selection UI.
- Use the supplied DailyLoaf logo and icon assets without implementing financial dashboard functionality.
- Add frontend unit/component tests and Docker browser validation.

## Non-goals

This change does not add financial accounts, transactions, budgets, AI, invitations, ownership transfer, password recovery, social login, OIDC, or MFA.

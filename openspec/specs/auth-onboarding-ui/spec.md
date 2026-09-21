# auth-onboarding-ui Specification

## Purpose
TBD - created by archiving change build-auth-onboarding-ui. Update Purpose after archive.
## Requirements
### Requirement: Provide public authentication pages

The frontend SHALL provide responsive `/register` and `/login` pages using the DailyLoaf full logo. Registration SHALL collect email, password, password confirmation, household name, and an editable currency selection defaulting to COP. Login SHALL show a generic authentication error and a link to registration without exposing password recovery.

#### Scenario: Register a new household

- **GIVEN** a visitor enters valid registration details
- **WHEN** the visitor submits the registration form
- **THEN** the client obtains a CSRF token, sends the request with credentials, and authenticates the returned session
- **AND** the client navigates to `/app`
- **AND** the UI displays field or form errors without logging sensitive values

#### Scenario: Reject invalid registration

- **GIVEN** registration fields are missing, passwords differ, or the password is too short
- **WHEN** the visitor submits the form
- **THEN** submission is prevented
- **AND** an accessible error summary and field-level errors are shown

#### Scenario: Login with invalid credentials

- **GIVEN** a visitor enters invalid credentials
- **WHEN** the visitor submits `/login`
- **THEN** the UI shows a generic authentication error
- **AND** it does not reveal whether the email exists

### Requirement: Use one credentialed typed API client

The frontend SHALL use one typed API client whose base URL comes from `NEXT_PUBLIC_API_URL`. Every request SHALL use `credentials: "include"`; session cookies SHALL never be read, parsed, or stored by JavaScript. Rails JSON errors SHALL be normalized into typed frontend errors.

#### Scenario: Send authenticated API requests

- **GIVEN** the browser has a valid Rails session cookie
- **WHEN** the client calls `/api/v1/auth/me` or logout
- **THEN** the request includes credentials
- **AND** no authentication token is written to localStorage or exposed in JSON/UI state

### Requirement: Protect state changes with in-memory CSRF handling

The client SHALL fetch CSRF before state-changing requests, keep the token only in memory, send it using `X-CSRF-Token`, and retry at most once after a stale-token rejection. It SHALL not retry indefinitely.

#### Scenario: Refresh a stale CSRF token once

- **GIVEN** a state-changing request receives Rails' invalid-CSRF error
- **WHEN** the client retries
- **THEN** it fetches a fresh token and retries exactly once
- **AND** a second CSRF rejection is surfaced as a typed error without another retry

### Requirement: Route authenticated users through the auth state

The frontend SHALL call `GET /api/v1/auth/me` on application startup, show loading while authentication is unknown, redirect unauthenticated users from `/app` to `/login`, and redirect authenticated users away from `/login` and `/register` to `/app`. These redirects SHALL be UX behavior only; Rails remains the authorization boundary.

#### Scenario: Protect the application shell

- **GIVEN** the current user request returns 401
- **WHEN** a visitor opens `/app`
- **THEN** the UI shows an authentication loading state first
- **AND** then redirects to `/login`

#### Scenario: Keep an authenticated user in the shell

- **GIVEN** `/api/v1/auth/me` returns an authenticated user
- **WHEN** the user opens `/login` or `/register`
- **THEN** the UI redirects to `/app`

### Requirement: Render the authenticated application shell

The `/app` route SHALL render an authenticated responsive shell with DailyLoaf branding, current user email, current household name and currency, responsive desktop/mobile navigation, sign-out, and a placeholder dashboard message. It SHALL not implement financial dashboard functionality.

#### Scenario: Reload an authenticated shell

- **GIVEN** a user has a valid Rails session
- **WHEN** the user reloads `/app`
- **THEN** the shell calls `/auth/me` and remains authenticated
- **AND** the current user and household information are shown

### Requirement: Select households explicitly

The shell SHALL automatically select the only household and SHALL show a selector for multiple memberships. It MAY store the last selected ID in localStorage only as a UI preference, SHALL validate it against the authenticated user's household list, and SHALL discard invalid IDs.

#### Scenario: Select among multiple households

- **GIVEN** the authenticated user belongs to multiple households
- **WHEN** the shell loads
- **THEN** it shows a labeled keyboard-accessible selector
- **AND** changing the selection updates displayed household details without creating an implicit authorization mechanism

#### Scenario: Reject an invalid stored household

- **GIVEN** localStorage contains an ID not present in the authenticated user's memberships
- **WHEN** the shell loads
- **THEN** it discards the stored ID
- **AND** selects a valid household instead

### Requirement: Use accessible DailyLoaf branding

The frontend SHALL use the supplied full logo on authentication pages and the supplied bread icon for compact navigation and the Next.js application icon. It SHALL resize the source icon for the favicon and SHALL use a text fallback only if the expected assets are absent. The visual system SHALL use deep teal, wheat gold, warm off-white, accessible errors, no gradients, and no generic stock-finance imagery.

#### Scenario: Navigate the interface accessibly

- **GIVEN** a visitor uses keyboard navigation or a screen reader
- **WHEN** they interact with authentication forms and shell controls
- **THEN** labels, autocomplete, focus states, error summaries, password toggles, and loading/disabled states are available
- **AND** duplicate form submissions are prevented

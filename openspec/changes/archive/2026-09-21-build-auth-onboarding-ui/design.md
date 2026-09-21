# Design: Authentication and onboarding UI

## Routes and page boundaries

- `/register`: public registration form for email, password, confirmation, household name, and editable ISO currency selection, defaulting to COP.
- `/login`: public login form with generic authentication errors and a registration link. Password recovery is not shown because it is deferred by the API design.
- `/app`: authenticated shell only. It displays DailyLoaf branding, current user email, selected household name/currency, a validated household selector, sign-out, responsive navigation, and a placeholder dashboard message. It contains no financial dashboard behavior.
- `/`: a small public entry point linking to registration and login; authenticated users may use the shell route directly.

Public routes redirect authenticated users to `/app`. `/app` loads `/api/v1/auth/me` before deciding whether to render or redirect to `/login`. Loading is visible while the decision is unknown. These redirects are UX only; Rails remains authoritative.

## Typed API client

Create `web/lib/api-client.ts` as the only application fetch boundary. It reads `NEXT_PUBLIC_API_URL`, sends `credentials: "include"` on every request, and exposes typed methods for:

- `getCurrentUser`
- `register`
- `login`
- `logout`
- `getCsrfToken`

The client stores the CSRF token in a module variable only. State-changing methods obtain a token first and send `X-CSRF-Token`. A Rails `invalid_csrf_token` response invalidates the in-memory token, fetches a fresh token, and retries exactly once. Other errors are normalized into a typed `ApiError` from the Rails `{ error: { code, message, details } }` envelope. No session token is read, parsed, logged, or stored in JavaScript or localStorage.

## Auth state

`web/components/auth-provider.tsx` owns the current-user loading state and calls `getCurrentUser` once on startup. A 401 becomes an unauthenticated state; other failures become an API error state. Registration/login update the provider after successful responses. Logout clears the provider after the API request completes and navigates to `/login`.

## Household selection

The authenticated user payload is the source of available households. With one membership, the shell selects it automatically. With multiple memberships, it renders a labeled keyboard-accessible select. The last selected ID may be stored in `localStorage` as a UI preference only after verifying it against the current user household list; invalid or stale IDs are discarded. No implicit active-household API endpoint is added.

## Visual and accessibility system

Use the supplied `/brand/dailyloaf-logo.png` in public auth layouts and `/brand/dailyloaf-icon.png` for compact navigation and the generated `app/icon.png`. The source icon is resized to a small web favicon rather than served at its original size. If assets are absent, the UI uses a text fallback and does not invent replacement artwork.

Use deep teal, wheat gold, warm off-white, and high-contrast foreground/error colors. Do not use gradients or stock-finance imagery. All fields have labels, autocomplete attributes, described errors, visible focus states, keyboard-accessible controls, accessible error summaries, password visibility toggles, and disabled/loading states. Forms prevent duplicate submissions.

## Testing

Use Vitest with Testing Library and jsdom for client/API behavior. Tests cover form validation, successful and failed authentication, loading/redirect decisions, CSRF acquisition/retry limits, logout, household auto-selection, multiple-household selection, and invalid localStorage preferences. Docker browser validation exercises registration, authenticated reload, logout, login, and absence of localStorage session tokens.

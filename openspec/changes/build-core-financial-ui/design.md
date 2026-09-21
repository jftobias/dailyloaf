# Design: Core financial management UI

## Existing API contract

Use the existing Rails JSON shapes rather than inventing a second contract:

- Accounts: `GET/POST/PATCH /api/v1/households/:household_id/accounts`, archive action; response `{ account }` or `{ accounts }`.
- Categories: `GET/POST/PATCH /categories`, archive action; response `{ category }` or `{ categories }`.
- Transactions: `GET/POST/PATCH/DELETE /transactions`, `post`, and `reverse` actions; response `{ transaction }`, `{ transactions }`, or correction/reversal objects.
- Transfers: `GET/POST/PATCH /transfers` and `reverse`; response `{ transfer }`, `{ transfers }`, or `{ reversal }`.
- Overview: `GET /overview?scope=shared|private|combined&from=YYYY-MM-DD&to=YYYY-MM-DD`; response `{ overview }` with decimal-string totals and account/category data.

All requests remain household-ID explicit and use the existing cookie/CSRF API client. No auth tokens are added to storage.

## Routes and shell

- `/app`: scope selector, current-month period, overview metrics, account balances, recent transactions, and empty states.
- `/app/accounts`: visible account list grouped by assets/liabilities, with archived state.
- `/app/accounts/new`: account creation.
- `/app/accounts/[accountId]`: account detail, posted/pending/projected balances, and visible activity.
- `/app/transactions`: visible transaction history with status/correction markers.
- `/app/transactions/new`: income/expense creation with centralized positive amount mapping.
- `/app/transfers/new`: compatible account transfer creation.
- `/app/settings/categories`: shared/private category management and archive actions permitted by the API.

Use existing route guards and AuthProvider. The household selector comes from authenticated memberships; no implicit active-household endpoint is introduced.

## Money and dates

The UI treats every monetary API value as a string. It never adds, subtracts, parses, or rounds authoritative money with JavaScript `Number`. Display formatting uses `Intl.NumberFormat` only at the presentation boundary after preserving the source string; form amounts remain decimal strings. User-facing income/expense amounts are positive, then a single mapping function sends income as positive impact and expense as negative impact. Dates remain `YYYY-MM-DD`.

The current month is calculated from the household time zone returned by the household/user API. Until a timezone-aware date helper is added, the client sends explicit calendar dates generated from the household IANA zone rather than browser locale.

## Privacy and scopes

The overview exposes only `shared`, `private`, and `combined` options supported by the current user. Rendered account, category, transaction, transfer, and overview data comes only from Rails responses. Private records are not inferred or reconstructed client-side. The UI labels the selected scope and avoids calling combined results universal household totals.

## Forms and idempotency

Create forms generate one UUID idempotency key when the submission attempt begins and reuse it if the API client retries. Duplicate submits are disabled while pending. Validation errors from Rails are normalized into field/form messages. Transfer forms only show accounts returned by the compatible-account filter and submit a single transfer request; they never create transaction legs.

## Responsive UX

Use existing DailyLoaf deep teal, wheat gold, warm off-white, logo/icon, and no gradients. Desktop emphasizes overview metrics and account groups; tablet keeps two-column account/transaction layouts where space permits; mobile prioritizes net worth, balances, transaction amounts, and primary actions. Navigation must not create horizontal overflow. Use semantic landmarks, labels, focus states, status/error live regions, and mobile-friendly controls.

## Testing

Extend Vitest/Testing Library tests for empty state, account rendering/forms, scope selection, decimal preservation, income/expense mapping, category filtering, compatible transfers, idempotency retry, validation errors, expired auth, household switching, and mobile navigation. Browser Docker validation covers registration/login precondition, empty state, account creation, expense/income, transfer, reload persistence, sign-out, and protected-route redirect.

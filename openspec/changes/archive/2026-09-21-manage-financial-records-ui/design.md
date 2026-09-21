# Design: Financial record lifecycle UI

## API boundary

Extend the existing typed API client only. Existing Rails endpoints are the source of truth:

- `GET/PATCH/DELETE /api/v1/households/:household_id/transactions/:id`
- `POST /transactions/:id/post`
- `POST /transactions/:id/reverse`
- `GET/PATCH /api/v1/households/:household_id/transfers/:id`
- `POST /transfers/:id/reverse`
- `POST /accounts/:id/archive`
- `POST /categories/:id/archive`

The backend response should include transaction `created_at` and `updated_at` strings and preserve `reversal_of_id`/`replacement_for_id`. Correction responses remain `{ reversal, replacement }`; reversal responses remain `{ reversal }`. Transfer responses represent the aggregate with source/destination account IDs and linked transaction IDs, never editable transfer legs.

The client sends credentials, CSRF headers, and idempotency keys through the existing client. API errors map `401`, `404`, `409`, and `422` to typed UX states without revealing ownership.

## Transaction detail and correction

Add `/app/transactions/[transactionId]` showing account, semantic type, category, positive user-facing amount, date, description, notes, status, timestamps, and correction relationships. Internal signed-impact terminology and raw database IDs are not displayed.

Pending transactions may be edited, posted, or deleted. A posted transaction is immutable: the UI offers reverse or correct actions only. Correction opens a form prefilled with original semantic values, explains that the original remains preserved, requires confirmation, and displays the resulting original/reversal/replacement chain. A completed reversal cannot be repeated.

## Transfer detail and correction

Add `/app/transfers/[transferId]`. Show the transfer as one event with source/destination account names, amount, date/status, and linked activity. Pending edits use the aggregate endpoint; posted transfers can be reversed once with an accessible confirmation. The UI never calls transaction mutation methods for transfer legs.

## Account and category lifecycle

Account detail retains posted/pending/projected balances and activity, adds date/status filters, and provides an accessible archive confirmation. Archived accounts remain visible in history and are excluded from account creation options.

Category management provides accessible archive confirmation for permitted custom categories. Archived categories remain visible on historical transactions but are excluded from new transaction category options. Default categories cannot be archived through the UI if the API rejects that operation.

## Errors and stale state

Use a reusable `ConfirmDialog` with focusable cancel/confirm controls, Escape handling where practical, and an alert/status region. Avoid browser-native dialogs. `401` clears auth and routes to login, `404` displays a generic not-found state, `409` explains stale/idempotency conflict and offers reload, `422` maps field/form errors, and network failures offer retry. Refresh the relevant record after mutation.

## Testing and browser flow

Add frontend tests for all lifecycle states, confirmation flows, API response shapes, and error mapping. Browser validation uses Docker to create pending/posted records, correct a posted expense, reverse a transfer, archive category/account, reload, sign out/in, and check responsive no-overflow layouts.

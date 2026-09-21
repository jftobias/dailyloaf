# Proposal: Build the core financial management UI

## Why

DailyLoaf has working household-scoped financial APIs but the authenticated shell still presents only a placeholder. Users need a small responsive workflow to create accounts, record income/expenses, transfer between compatible accounts, review activity, and inspect deterministic overview values before later financial features are considered.

## What Changes

- Replace the authenticated placeholder with a responsive financial overview.
- Add account list, account creation/detail, transaction history/creation, transfer creation, and category management routes.
- Extend the existing typed API client for the implemented Rails response shapes, CSRF, idempotency, decimal strings, and error states.
- Add empty states, loading states, scope controls, account/transaction forms, privacy-aware rendering, and mobile navigation.
- Add frontend tests and Docker browser validation.

## Non-goals

Do not add budgets, recurring transactions, bank integrations, AI, investment market data, receipts, split transactions, cross-currency support, authentication redesign, or new financial UI outside the listed routes.

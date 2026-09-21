# Proposal: Manage financial record lifecycle UI

## Why

DailyLoaf can create and review basic financial records, but users cannot inspect individual records or safely correct them after creation. The backend already distinguishes pending edits, posted immutability, reversal/replacement corrections, transfer aggregates, and archive behavior; the UI needs to expose those workflows without bypassing the ledger invariants.

## What Changes

- Add transaction and transfer detail routes.
- Add pending transaction editing/posting/deletion and posted reversal/correction UX.
- Add transfer detail and atomic reversal UX without exposing transfer legs as editable records.
- Complete account archive and historical activity UX.
- Complete category archive UX while retaining archived historical labels.
- Add reusable accessible confirmation dialogs and conflict/error handling.
- Extend typed API responses minimally for correction relationships and timestamps.
- Add tests and Docker browser validation.

## Non-goals

No budgets, recurring transactions, bank imports, AI, receipts, split transactions, investment market data, cross-currency support, or new financial domain architecture.

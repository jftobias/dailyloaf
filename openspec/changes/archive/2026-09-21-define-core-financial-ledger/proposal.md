# Proposal: Implement the core financial ledger

## Why

DailyLoaf has household authentication but no authoritative financial records. The approved signed-transaction architecture now needs implementation so balances, transfers, categories, and deterministic overview values can be persisted and tested before any financial UI is built.

## What Changes

Implement Rails models, migrations, services, JSON serializers, household-scoped endpoints, default categories, privacy filtering, idempotency, posted reversal/replacement corrections, transfer aggregate operations, and comprehensive RSpec coverage for the approved ledger design.

The MVP uses `Account`, `Category`, `FinancialTransaction`, and `Transfer` as an aggregate/service boundary. Transfers create and mutate exactly two linked transaction rows in one locked database transaction.

## Non-goals

Do not implement financial UI, budgets, recurring transactions, bank integrations, cross-currency support, live exchange rates, investment holdings, receipt uploads, AI explanations, or split transactions.

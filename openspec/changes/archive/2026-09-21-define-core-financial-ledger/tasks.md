# Tasks: Implement the core financial ledger

- [x] Preserve canonical household authorization, private/shared, overview, and monetary conventions.
- [x] Resolve the signed-transaction architecture, transfer boundary, default categories, privacy inheritance, base-currency MVP, pending/projected balances, reversal/replacement audit trail, rounding, overview scopes, idempotency, and household timezone.
- [x] Add household IANA timezone and default category provisioning for existing and new households without duplicates.
- [x] Add `Account`, `Category`, `FinancialTransaction`, and `Transfer` schema/models with constraints and indexes.
- [x] Add account, category, transaction, transfer, correction, balance, and overview domain services.
- [x] Add private/shared authorization and membership-scoped query boundaries.
- [x] Add idempotent create operations and reject direct transfer-leg mutation.
- [x] Add versioned household-scoped JSON endpoints and decimal-string serializers.
- [x] Add RSpec model, service, request, precision, privacy, concurrency, correction, and invalid-operation coverage.
- [x] Run API-level Docker validation for accounts, transfers, rollback, pending/projected balances, corrections, privacy scopes, idempotency, and cross-household 404.

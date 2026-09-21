# API Development Guidelines

These rules refine the cross-project rules in the repository root.

- Use Rails 8.1 API-only conventions and PostgreSQL for development and test.
- Keep business calculations in domain/service objects, not controllers.
- Every household-scoped endpoint must verify membership server-side; never trust an identifier supplied by the client.
- Store money as exact PostgreSQL decimals such as `decimal(14,2)`; never use floats for authoritative values.
- Add RSpec coverage for financial calculations, authorization boundaries, and API behavior.
- Run `bundle exec rspec` and `bundle exec rubocop` before completing backend work.
- Use `db:prepare` for safe setup; never add unconditional database recreation or destructive seed behavior.

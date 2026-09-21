# Development Guidelines

## Product boundaries

- Rails and PostgreSQL are the source of truth for financial data and calculations.
- AI explains deterministic financial snapshots; it never calculates balances or totals.
- Monetary values use exact decimals, never floating-point database columns.
- Household authorization and private-versus-shared transaction visibility require tests.

## Rails API

- Keep business calculations in domain/service objects, not controllers.
- Add RSpec coverage for financial calculations, authorization, and API behavior.
- Run `bundle exec rspec` and `bundle exec rubocop` before completing backend work.

## Web

- Use TypeScript and accessible React components.
- Keep financial aggregation out of the browser.
- Run type checking, linting, and relevant frontend tests before completing web work.

## Pull requests

- Reference the GitHub issue and approved OpenSpec change.
- Describe migrations, privacy implications, and financial behavior changes.
- Do not merge or deploy automatically.

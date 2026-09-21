# DailyLoaf Development Guidelines

## Product boundaries

- Rails and PostgreSQL are the source of truth for financial data and calculations.
- AI explains deterministic financial snapshots; it never calculates balances or totals.
- Monetary values use exact decimals, never floating-point database columns.
- Household authorization and private-versus-shared transaction visibility require tests.
- Keep this foundation change limited to application setup and local infrastructure; do not implement financial domain behavior yet.

## Quality gates

- Run backend RSpec and RuboCop checks before completing backend work.
- Run frontend type checking and linting before completing frontend work.
- Validate Docker Compose configuration and service health for infrastructure changes.

## Pull requests

- Reference the GitHub issue and approved OpenSpec change.
- Describe migrations, privacy implications, and financial behavior changes.
- Do not merge or deploy automatically.

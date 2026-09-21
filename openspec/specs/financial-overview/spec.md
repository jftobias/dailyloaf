# Financial overview

## Purpose

Define the future household financial overview and advisory analysis boundaries without making AI authoritative over financial data.

## Requirements

### Requirement: Monthly household snapshot

The application SHALL present calculated monthly income, expenses, net cash flow,
savings rate, budget progress, goal progress, and recent transactions for the
selected household and period.

#### Scenario: View the current month

- **GIVEN** a member can access a household
- **WHEN** the member opens the overview
- **THEN** the application shows only that household's calculated financial snapshot
- **AND** monetary values are formatted in the household's configured currency

### Requirement: On-demand AI explanation

AI analysis SHALL be generated only after a user requests it and SHALL receive a
server-calculated financial snapshot rather than raw authority over balances.

#### Scenario: Ask for detailed analysis

- **GIVEN** a valid calculated snapshot exists
- **WHEN** a member asks for AI analysis
- **THEN** the response follows the approved structured-output schema
- **AND** the UI labels recommendations separately from deterministic totals

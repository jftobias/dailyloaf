# Devin starting prompt

Read `AGENTS.md`, `openspec/config.yaml`, `MVP_SCOPE.md`, and all existing
specifications before changing code.

Create an OpenSpec change proposal for the DailyLoaf MVP. Do not implement it
yet.

The proposal must:

1. Define the Rails 8.1 API and PostgreSQL domain model.
2. Define household authorization boundaries.
3. Define exact-decimal money handling.
4. Define the Next.js dashboard contract with Rails.
5. Define deterministic monthly snapshot calculations.
6. Define on-demand AI analysis using Structured Outputs.
7. Divide implementation into small, reviewable tasks with automated tests.
8. Identify unresolved product decisions instead of inventing behavior.

Use the current `financial-overview` specification as the baseline. Produce the
proposal, design, tasks, and required spec deltas. Stop after creating and
validating the OpenSpec artifacts so they can be reviewed before implementation.

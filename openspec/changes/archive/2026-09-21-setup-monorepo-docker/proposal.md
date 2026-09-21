# Proposal: Set up the DailyLoaf monorepo and Docker development environment

## Why

DailyLoaf needs a repeatable local environment so API, browser, and database work can be developed and validated without machine-specific service installation. Docker provides consistent Rails/PostgreSQL/Next.js boundaries while preserving PostgreSQL data between restarts.

## Scope

This change scaffolds the Rails 8.1 API-only service and Next.js 16 frontend, adds PostgreSQL 18, and documents the development workflow. It deliberately does not implement transactions, budgets, goals, AI analysis, bank integrations, or other financial-domain behavior.

## Acceptance criteria

- The API and web services build and run through Docker Compose.
- PostgreSQL is health-checked and persists data in a named volume.
- Rails exposes `/up` on container port 3000, mapped to host port 3001.
- Next.js listens on container port 3000, mapped to host port 3000.
- Environment and privacy rules do not require committed secrets.
- RSpec, frontend linting, and frontend type checking are runnable in containers.

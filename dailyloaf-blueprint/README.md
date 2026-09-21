# DailyLoaf MVP blueprint

This bundle contains the agent instructions and OpenSpec files used to define
the first DailyLoaf MVP slice.

## Contents

- `AGENTS.md` — engineering, testing, privacy, and pull-request rules for Devin.
- `openspec/config.yaml` — project context and non-negotiable financial rules.
- `openspec/specs/financial-overview/spec.md` — behavioral requirements for the dashboard and AI analysis.
- `MVP_SCOPE.md` — target architecture, domain scope, and acceptance criteria.
- `DEVIN_START_PROMPT.md` — a starting prompt for creating the implementation plan.

## Intended stack

- Rails 8.1 JSON API
- PostgreSQL
- Next.js, React, and TypeScript
- Tailwind CSS and shadcn/ui
- Recharts
- RSpec and frontend browser tests
- OpenAI Responses API with Structured Outputs
- OpenSpec and Devin CLI

## How to use the bundle

1. Create the repository with `api/` and `web/` applications.
2. Copy `AGENTS.md` and the complete `openspec/` directory to the repository root.
3. Install OpenSpec and initialize its Devin integration if it is not already configured.
4. Give Devin the prompt from `DEVIN_START_PROMPT.md`.
5. Review the generated proposal, design, tasks, and spec changes before allowing implementation.
6. Keep the first pull request limited to the approved MVP scope.

The current published demonstration uses sample browser state. The recreated
MVP should persist all authoritative records in PostgreSQL through Rails.

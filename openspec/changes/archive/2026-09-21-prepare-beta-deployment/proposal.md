# Proposal: Prepare the DailyLoaf production beta

## Why

DailyLoaf's first ten-user beta needs documented, reproducible production configuration before external services are created. The repository must validate production container behavior, credential boundaries, CORS/cookie topology, CI, backups, and rollback without deploying or handling real secrets.

## What Changes

- Harden production Rails container startup and platform-port behavior.
- Add auth rate-limit configuration and deterministic request coverage.
- Add safe production environment inventory and credential guidance.
- Add Railway/Vercel configuration documentation and a beta runbook.
- Add pull-request CI for Rails, Next.js, OpenSpec, and repository hygiene.
- Preserve the current host-only SameSite=Lax cookie strategy and require custom same-site subdomains before production authentication.

## Non-goals

No external Railway/Vercel project, domain, database, deployment, production credential, or OpenAI key is created or configured by this change.

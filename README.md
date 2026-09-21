# DailyLoaf

DailyLoaf is a private household financial management application. This repository contains the Rails API, Next.js frontend, core financial ledger, lifecycle UI, and local Docker development environment.

## Architecture

- `api/`: Rails 8.1 API-only application backed by PostgreSQL.
- `web/`: Next.js 16 App Router frontend using React, TypeScript, Tailwind CSS, and pnpm.
- `db`: PostgreSQL 18 with persistent local storage.
- `openspec/`: authoritative product specifications and approved infrastructure changes.

Rails and PostgreSQL remain authoritative for money and calculations. Future financial values must use exact decimals, never floating-point database columns. Household authorization and privacy boundaries belong on the API, while the browser formats and renders API results.

## Local Docker development

Prerequisites: Docker Desktop with Compose.

```sh
docker compose build
docker compose up -d
docker compose exec api bin/rails db:prepare
docker compose exec api env RAILS_ENV=test bin/rails db:prepare
docker compose exec api env RAILS_ENV=test bundle exec rspec
docker compose exec web pnpm lint
docker compose exec web pnpm typecheck
```

Open these URLs:

- Web: <http://localhost:3000>
- API: <http://localhost:3001>
- API health: <http://localhost:3001/up>

The web foundation page checks the Rails health endpoint and reports whether the API is reachable. `WEB_PORT` controls the host port for the web container and defaults to `3000`; the container always listens on port `3000`. `CORS_ORIGINS` accepts a comma-separated list of explicit origins and defaults to `http://localhost:3000`. Wildcard origins are not allowed.

For example, to run the browser health check on another host port without changing the normal defaults:

```sh
WEB_PORT=3002 CORS_ORIGINS=http://localhost:3002 docker compose up -d
```

Keep `NEXT_PUBLIC_API_URL=http://localhost:3001` so browser requests continue to target the API's host port.

To stop the environment while keeping PostgreSQL data, run:

```sh
docker compose down
```

To intentionally remove the local development database volume and all data stored in it, run:

```sh
docker compose down -v
```

Copy `.env.example` to `.env` if you need to override local defaults. `DATABASE_URL` is used by development and `TEST_DATABASE_URL` points to the isolated test database. Do not commit `.env`, Rails credentials, dependency directories, build output, or local database files.

## Validation

Backend checks:

```sh
docker compose exec api env RAILS_ENV=test bin/rails db:prepare
docker compose exec api env RAILS_ENV=test bundle exec rspec
docker compose exec api bundle exec rubocop
```

Frontend checks:

```sh
docker compose exec web pnpm lint
docker compose exec web pnpm typecheck
```

The current API includes native Rails cookie authentication, household access, and the core financial ledger. Authentication endpoints are versioned under `/api/v1/auth`; financial routes are under `/api/v1/households/:household_id/...` and enforce membership/privacy server-side. Financial UI and lifecycle routes are documented in OpenSpec.

For production beta preparation, see [`docs/BETA_DEPLOYMENT.md`](docs/BETA_DEPLOYMENT.md) and the safe variable inventory at [`deploy/production.env.example`](deploy/production.env.example).

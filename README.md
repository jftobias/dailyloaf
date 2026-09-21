# DailyLoaf

DailyLoaf is a private household financial management application. This repository currently contains the application foundations and local Docker development environment; the financial domain is intentionally not implemented yet.

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

The current API foundation includes native Rails cookie authentication and household access. Authentication endpoints are versioned under `/api/v1/auth`: register, create/delete session, current user, and CSRF token. Household routes are under `/api/v1/households/:household_id/...` and enforce membership server-side. Financial records are intentionally not implemented yet.

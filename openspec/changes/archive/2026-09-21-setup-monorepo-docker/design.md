# Design: Monorepo Docker foundation

## Service boundaries

- `db` owns PostgreSQL 18 storage and exposes no host port by default.
- `api` owns Rails routing, health reporting, database access, authorization, and future authoritative financial calculations.
- `web` owns the Next.js presentation layer and calls the API over the browser-visible URL.

No Redis, background queue, bank integration, or deployment service is included because the current MVP does not require it.

## Port mappings

- `web`: container `3000` -> configurable host `WEB_PORT` (default `3000`, `http://localhost:3000`).
- `api`: container `3000` -> host `3001` (`http://localhost:3001`).
- `db`: internal Compose network only, PostgreSQL default port `5432`.

## Environment responsibilities

Compose supplies database credentials and connection details to Rails. `DATABASE_URL` uses the Compose hostname `db`; Rails also receives discrete PostgreSQL variables for database configuration and tests. `NEXT_PUBLIC_API_URL` is deliberately the host-visible API URL because browser JavaScript runs outside the Compose network. `CORS_ORIGINS` controls the API's explicit, comma-separated local CORS allowlist; wildcard origins are rejected. `WEB_PORT` changes only the host-side web mapping and defaults to `3000`.

Development defaults are safe placeholders only. Real secrets and Rails credential files remain ignored.

## Development workflow

Build images with `docker compose build`, start with `docker compose up -d`, and prepare the schema with `docker compose exec api bin/rails db:prepare`. Code mounts enable Rails reloads and Next.js hot reloads. Named volumes preserve gems, Node dependencies, Next build state, and PostgreSQL data; `docker compose down` does not remove them.

The API entrypoint is not used for implicit destructive setup. The Compose command explicitly runs `db:prepare` before the development server.

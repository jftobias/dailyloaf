# Infrastructure foundation

## ADDED Requirements

### Requirement: Local service composition

The repository SHALL provide a Docker Compose development environment with PostgreSQL 18, a Rails API, and a Next.js frontend using the service boundaries and port mappings defined by the infrastructure design. The web host port SHALL be configurable with `WEB_PORT`, defaulting to `3000`, while the container listens on `3000`.

#### Scenario: Start the local environment

- **GIVEN** Docker Desktop is available
- **WHEN** a developer runs `docker compose up`
- **THEN** PostgreSQL becomes healthy before the API starts
- **AND** the API is reachable at `http://localhost:3001/up`
- **AND** the frontend is reachable at `http://localhost:3000`

### Requirement: Persistent development database

The Compose environment SHALL store PostgreSQL data in a named volume and SHALL use `db:prepare` rather than destructive database recreation during API startup.

#### Scenario: Restart without data loss

- **GIVEN** development data exists in PostgreSQL
- **WHEN** a developer runs `docker compose down` and then `docker compose up`
- **THEN** the same PostgreSQL data remains available
- **AND** the developer can intentionally remove it only with `docker compose down -v`

### Requirement: Environment-boundary configuration

The services SHALL receive database credentials, Rails environment, explicit CORS origins, and browser-visible API URL from environment variables with development-only placeholder defaults. `CORS_ORIGINS` SHALL accept comma-separated non-wildcard origins.

#### Scenario: Keep secrets out of source control

- **GIVEN** a developer configures local environment values in `.env`
- **WHEN** the services start
- **THEN** Rails connects using the configured database URL
- **AND** `.env` and Rails credential keys remain ignored by Git

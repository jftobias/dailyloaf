# Production beta readiness

## ADDED Requirements

### Requirement: Run a platform-port production API

The production API image SHALL run Puma on `0.0.0.0`, read `PORT`, use `DATABASE_URL` and `RAILS_MAX_THREADS`, log to stdout, serve `/up`, and run migrations only through a separate release/pre-deploy command.

#### Scenario: Start a production service

- **GIVEN** Railway supplies `PORT` and `DATABASE_URL`
- **WHEN** the production container starts
- **THEN** Puma listens on the supplied port
- **AND** the process does not run migrations on every start
- **AND** `/up` can be used as a health check

### Requirement: Protect beta authentication boundaries

Production SHALL use HTTPS, secure HttpOnly host-only SameSite=Lax cookies, explicit credentialed CORS origins, CSRF protection, and rate-limited registration/login/CSRF requests. Wildcard origins and frontend-readable secrets SHALL be rejected.

#### Scenario: Configure same-site beta hosts

- **GIVEN** `app.<custom-domain>` and `api.<custom-domain>` are configured
- **WHEN** the browser authenticates against the API
- **THEN** credentials and CSRF headers are accepted only from the exact app origin
- **AND** the session cookie remains host-only to the API

### Requirement: Document provider setup without deploying

The repository SHALL document Railway API/Postgres setup, private variables, release/start/health commands, domain, backup, restore, rollback, and Vercel root/install/build/environment settings using placeholders only. It SHALL not require Redis, deploy from pull requests, or configure an OpenAI key.

#### Scenario: Prepare a beta operator

- **GIVEN** an operator has no production project or domain yet
- **WHEN** they follow the runbook
- **THEN** they can create credentials and provider resources without placing secrets in Git
- **AND** can validate health, migrations, smoke tests, backup, and rollback steps

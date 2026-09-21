# Design: Production beta readiness

## Production API container

Use `api/Dockerfile`'s existing production stage. The production command invokes Rails/Puma on `0.0.0.0` without hardcoding a port so Puma reads Railway's platform-provided `PORT`. The image has no writable application data requirement, runs as a non-root `rails` user, and logs to stdout. Production startup never runs migrations; Railway's release/pre-deploy command runs `bin/rails db:prepare` separately.

The `/up` endpoint is the health check. Rails production forces HTTPS, and the database uses `DATABASE_URL` with pool sizing from `RAILS_MAX_THREADS`.

## Authentication and CORS

Native Rails authentication remains cookie-based:

- Host-only cookie
- HttpOnly
- SameSite=Lax
- Secure in production
- HTTPS required
- Credentials included by the browser

The production topology must use same-site subdomains:

- `app.<custom-domain>` on Vercel
- `api.<custom-domain>` on Railway

`CORS_ORIGINS` must be an explicit production frontend origin. Wildcards are rejected. `FRONTEND_URL` may provide the single fallback when `CORS_ORIGINS` is absent, but production should set `CORS_ORIGINS` explicitly. CORS permits credentials, CSRF, and idempotency headers.

Registration, login, and CSRF-token requests use Rails rate limiting with JSON `429` responses. The production environment already uses Rails Solid Cache (`config.cache_store = :solid_cache_store`) backed by the `cache` database configured in `config/cache.yml`; Rails' native rate limiter uses `Rails.cache`, so limits persist across API restarts and are shared by multiple API instances connected to the same production database. Redis is not required.

## Credentials and secrets

Production credentials are separate from development credentials. Operators may run:

```sh
cd api
RAILS_ENV=production bin/rails credentials:edit --environment production
```

Commit only `api/config/credentials/production.yml.enc` if it contains no unintended secret values. Store `api/config/credentials/production.key` only in Railway as `RAILS_MASTER_KEY`; it remains ignored. Never overwrite or expose the development `api/config/master.key`. No OpenAI key is included because AI is deferred.

## Railway preparation

Railway configuration is documented rather than executed:

- Connect the GitHub repository.
- Create an API service rooted at `api/` using `api/Dockerfile` production stage.
- Add Railway PostgreSQL.
- Reference the private Postgres `DATABASE_URL`.
- Set release/pre-deploy command `bin/rails db:prepare`.
- Set start command `bin/rails server -b 0.0.0.0`.
- Configure `/up` health check, restart policy, logs, and custom API domain.
- Enable backups and document restore/rollback procedures.

No Redis service is required.

## Vercel preparation

The existing frontend project remains rooted at `web`:

- Package manager: pnpm
- Install: `pnpm install --frozen-lockfile`
- Build: `pnpm build`
- Default Next.js output
- Production public variable: `NEXT_PUBLIC_API_URL=https://api.<custom-domain>`

Changing a `NEXT_PUBLIC_` value requires a Vercel redeployment. No private secret or OpenAI key may use a `NEXT_PUBLIC_` variable. No `vercel.json` is required.

## CI

The root GitHub Actions workflow validates backend PostgreSQL/RSpec/RuboCop, frontend frozen install/tests/lint/typecheck/build, OpenSpec via pinned `@fission-ai/openspec@1.3.0`, and `git diff --check`. Pull requests never deploy production.

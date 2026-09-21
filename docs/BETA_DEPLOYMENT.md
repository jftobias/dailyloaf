# DailyLoaf ten-user beta runbook

This is a preparation and operations runbook. It does not deploy anything and contains no secret values.

## Production topology

Use same-site custom subdomains for the durable beta:

- `dailyloaf.online` → Vercel (Next.js frontend, already deployed)
- `api.dailyloaf.online` → Railway (Rails API)

The API session cookie remains host-only to the API domain, HttpOnly, Secure, and SameSite=Lax. The browser sends `credentials: "include"`; Rails CORS allows exactly `https://dailyloaf.online`. Production and staging must never share databases, cookies, credentials, or secrets.

### Temporary provider-domain test mode

Before custom DNS is available, the stable Vercel production `*.vercel.app` origin and a generated Railway `*.up.railway.app` API origin may be used for validation. Set the exact Vercel origin in `CORS_ORIGINS`, use HTTPS, and set `SESSION_COOKIE_SAME_SITE=none`. This mode still uses Secure, HttpOnly, host-only cookies, credentials, and CSRF. Test with regular Chrome configured to allow third-party cookies. Do not use this mode for arbitrary preview origins; return to `lax` once `api.dailyloaf.online` is active.

## 1. Create production Rails credentials

From a trusted local checkout:

```sh
cd api
bin/rails credentials:edit --environment production
```

This creates `config/credentials/production.yml.enc` and a local `config/credentials/production.key`. Both already exist for this repository; preserve them and do not rotate unless there is a security reason. The encrypted file is committed; the key file is gitignored and stays local-only.

Railway's `RAILS_MASTER_KEY` variable must contain the contents of `api/config/credentials/production.key`. Seal the variable after adding it. Never commit, print, document, or bake the key into a Docker image. Do not replace `config/master.key`, which is the development key.

The current beta does not use an OpenAI key. Do not add `OPENAI_API_KEY` until an approved AI feature consumes it.

## 2. Railway API service

A previous deployment attempt failed because Railway built the repository root with Railpack. The API is not a root-level app: the service must be scoped to `api/` and built from its Dockerfile. With `Root Directory: /api`, Railway finds `api/Dockerfile` and `api/railway.toml` automatically.

### Dashboard settings (manual — not encodable in config files)

| Setting | Value |
|---|---|
| Service name | `api` |
| Source repo | `jftobias/dailyloaf` |
| GitHub branch | `main` |
| Root Directory | `/api` |
| Environment | `staging` for validation; `production` for beta |

### Build and deploy settings

These are codified in `api/railway.toml` (legacy Config as Code; readable until 2026-12-01, then migrate to `.railway/railway.ts` Infrastructure as Code). The same values can be set in the dashboard, which the file overrides during deployments that read it:

| Setting | Value |
|---|---|
| Builder | `Dockerfile` (not Railpack) |
| Dockerfile path | `Dockerfile` (relative to the `/api` root) |
| Pre-deploy command | `bin/rails db:prepare` |
| Health-check path | `/up` |
| Health-check timeout | `300` seconds |
| Restart policy | `ON_FAILURE`, max 10 retries |
| Start command | Dockerfile default (`bin/rails server -b 0.0.0.0`); leave unset |

Migrations run once per release through the pre-deploy command, never inside Puma startup.

### PostgreSQL service

- One Railway PostgreSQL service named `Postgres` serves both the primary and Solid Cache connections for this beta.
- Reference `DATABASE_URL` via Railway reference variables; do not manually copy the PostgreSQL username, password, hostname, or port.
- Do not enable public networking on the PostgreSQL service.
- Do not add Redis or a worker service for the current MVP.

Production rate limiting uses Rails' native limiter backed by `Rails.cache`; production config selects Solid Cache on the named `cache` connection, so limits persist across restarts and are shared by API instances using the same database.

## 3. Railway API service variables

```text
RAILS_ENV=production
RAILS_MASTER_KEY=<contents of api/config/credentials/production.key>

DATABASE_URL=${{Postgres.DATABASE_URL}}
CACHE_DATABASE_URL=${{Postgres.DATABASE_URL}}

CORS_ORIGINS=https://dailyloaf.online
FRONTEND_URL=https://dailyloaf.online
SESSION_COOKIE_SAME_SITE=lax

RAILS_MAX_THREADS=5
WEB_CONCURRENCY=1
RAILS_LOG_TO_STDOUT=true
```

Notes:

- `DATABASE_URL` and `CACHE_DATABASE_URL` intentionally reference the same `Postgres` service for the beta; Rails keeps separate connections and migration paths (`db/migrate` vs `db/cache_migrate`). Split them only if a real need appears.
- Do not define `PORT`; Railway supplies it and Puma reads it via `config/puma.rb`.
- Seal `RAILS_MASTER_KEY` after adding it.
- `SESSION_COOKIE_SAME_SITE=lax` is correct for the shared `dailyloaf.online` parent domain. Use `none` only for the temporary provider-domain test mode.
- Never set a `NEXT_PUBLIC_*` secret, and never configure `OPENAI_API_KEY` yet.

## 4. Deploy and health check

After a reviewed deployment through Railway:

```sh
curl -fsS https://<generated>.up.railway.app/up
```

Validate `/up` on the Railway-generated domain **before** adding the custom API domain. Once it passes, add the custom host `api.dailyloaf.online` in Railway and configure its DNS record.

Inspect Railway deployment logs and health status. A pre-deploy (`db:prepare`) failure must stop the release before traffic is switched.

## 5. Domain and Vercel

1. Point `api.dailyloaf.online` to Railway using the DNS record Railway provides (only after `/up` passes on the generated domain).
2. Point `dailyloaf.online` to Vercel using the DNS record Vercel provides.
3. In Vercel, keep the project root directory `web`.
4. Use pnpm with install command `pnpm install --frozen-lockfile`.
5. Use build command `pnpm build`; Next.js output defaults apply (no `vercel.json` required).
6. Set production `NEXT_PUBLIC_API_URL=https://api.dailyloaf.online`.
7. Redeploy Vercel after changing any `NEXT_PUBLIC_*` value; public values are build-time inputs.

## 6. Production smoke test

After both domains are active:

1. Register a test beta user.
2. Confirm login and `/api/v1/auth/me`.
3. Create accounts, income, expense, and transfer records.
4. Confirm corrections, archives, overview totals, logout, and sign-in persistence.
5. Check browser storage contains no auth token.
6. Inspect network requests for credentials, CSRF, explicit CORS, decimal strings, and idempotency keys.
7. Remove or anonymize the smoke-test household according to the approved data-retention procedure.

## 7. Backups and restore

Enable automated PostgreSQL backups before inviting beta users. Record the backup retention and PITR window in the project handoff.

Restore procedure:

1. Pause application writes or place the API in a maintenance mode.
2. Identify the approved restore point in Railway.
3. Restore into a separate staging database first.
4. Run Rails `db:prepare` against staging and verify `/up`, auth, and ledger smoke tests.
5. Approve production restore only after comparing the restore point and impact.
6. Rotate credentials if the restore involved a security event.

## 8. Rollback

For an application regression, use Railway's deployment history to roll back the API image and Vercel's deployment history to promote the previous frontend deployment. Do not roll back migrations blindly; review schema compatibility and use a forward migration when necessary.

## 9. Secret rotation

To rotate Rails secrets:

1. Generate a new production credential/key pair locally.
2. Update Railway `RAILS_MASTER_KEY` atomically with the encrypted credentials file.
3. Redeploy the API.
4. Verify `/up`, login, CSRF, and session behavior.
5. Revoke the old key after confirming no rollback requires it.

Never expose secrets in CI logs, Docker build args, Vercel public variables, documentation, tests, or browser storage.

## 10. Adding AI later

Only after an approved AI OpenSpec change adds a consuming backend feature should an OpenAI key be introduced. Store it only as a private API platform secret; never expose it through `NEXT_PUBLIC_*`, the browser, logs, images, or committed files.

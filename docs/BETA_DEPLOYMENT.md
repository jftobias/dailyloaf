# DailyLoaf ten-user beta runbook

This is a preparation and operations runbook. It does not deploy anything and contains placeholders only.

## Production topology

Use same-site custom subdomains for the durable beta:

- `app.<custom-domain>` → Vercel
- `api.<custom-domain>` → Railway

The API session cookie remains host-only to the API domain, HttpOnly, Secure, and SameSite=Lax. The browser sends `credentials: "include"`; Rails CORS allows exactly `https://app.<custom-domain>`. Production and staging must never share databases, cookies, credentials, or secrets.

### Temporary provider-domain test mode

Before custom DNS is available, use the stable Vercel production `*.vercel.app` origin and generated Railway `*.up.railway.app` API origin. Set the exact Vercel origin in `CORS_ORIGINS`, use HTTPS, and set `SESSION_COOKIE_SAME_SITE=none`. This mode still uses Secure, HttpOnly, host-only cookies, credentials, and CSRF. Test with regular Chrome configured to allow third-party cookies. Do not use this mode for arbitrary preview origins; return to `lax` after custom same-site subdomains are active.

## 1. Create production Rails credentials

From a trusted local checkout:

```sh
cd api
RAILS_ENV=production bin/rails credentials:edit --environment production
```

This creates `config/credentials/production.yml.enc` and a local `config/credentials/production.key`. Commit only the encrypted file if it contains no unintended values. Copy the key into Railway as `RAILS_MASTER_KEY`; never commit, print, document, or put it in a Docker image. Do not replace `config/master.key`, which is the development key.

The current beta does not use an OpenAI key. Do not add `OPENAI_API_KEY` until an approved AI feature consumes it.

## 2. Create Railway services

1. Connect the GitHub repository in Railway.
2. Create a production environment and a separate staging environment.
3. Create an API service rooted at `api/` using `api/Dockerfile` and its `production` target.
4. Create Railway PostgreSQL in the same production environment.
5. Reference the database service's private `DATABASE_URL`; do not paste a public URL into source control.
6. Set the API release/pre-deploy command to `bin/rails db:prepare`.
7. Set the API start command to `bin/rails server -b 0.0.0.0`. Puma reads Railway's `PORT`.
8. Configure the health check path `/up`, restart policy, and log retention.
9. Add the custom API domain `api.<custom-domain>` after DNS is ready.
10. Enable database backups/PITR according to the selected Railway plan.

Do not add Redis or a worker service for the current MVP. Production rate limiting uses Rails' native limiter backed by `Rails.cache`; production config selects Solid Cache with its separate `cache` database, so limits persist across restarts and are shared by API instances using the same database.

## 3. Railway variables

Set these privately in Railway:

```text
RAILS_ENV=production
RAILS_MASTER_KEY=<production-key>
DATABASE_URL=<private-railway-postgresql-url>
CACHE_DATABASE_URL=<same-private-railway-postgresql-url>
CORS_ORIGINS=https://app.<custom-domain>
FRONTEND_URL=https://app.<custom-domain>
RAILS_MAX_THREADS=5
WEB_CONCURRENCY=1
RAILS_LOG_TO_STDOUT=1
```

`PORT` is platform-provided. Never set a production `NEXT_PUBLIC_*` secret. Never configure `OPENAI_API_KEY` yet.

## 4. Deploy and health check

After a reviewed production deployment is initiated through Railway:

```sh
curl -fsS https://api.<custom-domain>/up
```

Inspect Railway deployment logs and health status. A release failure must stop before traffic is switched. Migrations run once through the release command, not during every Puma start.

## 5. Configure the domain and Vercel

1. Purchase or select the custom domain.
2. Point `api.<custom-domain>` to Railway using the DNS record Railway provides.
3. Point `app.<custom-domain>` to Vercel using the DNS record Vercel provides.
4. In Vercel, keep the project root directory `web`.
5. Use pnpm with install command `pnpm install --frozen-lockfile`.
6. Use build command `pnpm build`.
7. Set production `NEXT_PUBLIC_API_URL=https://api.<custom-domain>`.
8. Redeploy Vercel after changing any `NEXT_PUBLIC_*` value; public values are build-time inputs.

No `vercel.json` is required for the current Next.js project.

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

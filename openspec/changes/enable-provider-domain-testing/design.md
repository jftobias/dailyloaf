# Design: Temporary provider-domain testing

## Database connections

Production `database.yml` defines logical `primary` and `cache` connections. `DATABASE_URL` and `CACHE_DATABASE_URL` point to the same Railway PostgreSQL service for the beta while retaining separate Rails migration/schema paths and table namespaces. The cache connection must not rely on implicit inheritance from `DATABASE_URL`; the environment inventory exposes it explicitly.

Solid Cache uses `config/cache.yml`'s `database: cache` setting and Rails' production `:solid_cache_store`. Active Job uses the in-process adapter for the beta, so no queue database, worker, second PostgreSQL service, or Redis service is required.

## Cookie policy

`SESSION_COOKIE_SAME_SITE` accepts only `lax` or `none`; default `lax`. `none` is valid only in production, where `force_ssl` is enabled and both session/CSRF cookies are Secure. Cookies remain HttpOnly and host-only. CORS must list the exact stable Vercel origin, credentials stay enabled, and CSRF remains mandatory.

Temporary testing uses the generated HTTPS Railway and Vercel URLs with regular Chrome configured to allow third-party cookies. Custom-domain topology should return to `lax`.

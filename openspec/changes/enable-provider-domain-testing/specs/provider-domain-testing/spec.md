# Provider-domain authentication testing

## ADDED Requirements

### Requirement: Configure explicit logical production databases

Production SHALL define primary and cache logical connections. The beta SHALL be able to point both URLs at one PostgreSQL service while retaining separate migration/schema paths and table namespaces. Cache SHALL not depend on undocumented implicit `DATABASE_URL` inheritance; no queue database or worker service is required for the beta.

#### Scenario: Prove one-service production boot

- **GIVEN** all three logical URLs point to one PostgreSQL service
- **WHEN** Rails boots in production and `db:prepare` runs
- **THEN** primary data, Rails.cache writes/reads, and rate limiting work
- **AND** no second physical database or Redis service is required

### Requirement: Support explicit temporary SameSite policy

The API SHALL accept `SESSION_COOKIE_SAME_SITE=lax|none`, default to `lax`, reject other values, and reject `none` outside production HTTPS. Session and CSRF cookies SHALL remain Secure, HttpOnly, and host-only when `none` is used. Credentials, exact-origin CORS, CSRF, and cookie authentication SHALL remain required.

#### Scenario: Test provider domains securely

- **GIVEN** HTTPS provider domains and `SESSION_COOKIE_SAME_SITE=none`
- **WHEN** Chrome allows third-party cookies and the frontend authenticates
- **THEN** the API sets Secure HttpOnly host-only cookies with SameSite=None
- **AND** no JWT or browser storage token is introduced

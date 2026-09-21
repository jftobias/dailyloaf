# Proposal: Enable temporary provider-domain authentication testing

## Why

The initial Railway/Vercel beta must be smoke-tested on temporary provider domains before custom same-site subdomains exist. The API needs an explicit, production-only cookie policy switch that permits cross-site provider domains without weakening the default custom-domain posture.

## What Changes

- Add `SESSION_COOKIE_SAME_SITE=lax|none` with `lax` as the default.
- Require production HTTPS and Secure cookies for `none`.
- Apply the policy consistently to the session and CSRF cookies.
- Keep cookies HttpOnly and host-only, require credentials and CSRF, and retain exact CORS origins.
- Document temporary Vercel/Railway testing and browser third-party-cookie prerequisites.
- Prove primary/cache/queue logical connections can share one PostgreSQL service.

## Non-goals

No external deployment, domain creation, JWT, localStorage authentication, Redis, or OpenAI integration.

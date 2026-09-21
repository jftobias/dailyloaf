<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## DailyLoaf frontend rules

These rules refine the cross-project rules in the repository root.

- Use accessible React components and strict TypeScript; preserve the App Router conventions documented by the installed Next.js version.
- Keep authoritative financial aggregation and privacy enforcement at the Rails API boundary, not in browser code.
- Read and validate API responses at a typed boundary; do not duplicate financial business rules in the browser.
- Run `pnpm lint`, `pnpm typecheck`, and relevant frontend tests before completing web work.

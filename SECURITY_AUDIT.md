# Security Audit

Last reviewed: May 14, 2026.

## Scope

This audit covers the AI Support Agent Dashboard before public push and deployment. Reviewed areas include Next.js API routes, Supabase schema and row-level security, Vercel deployment monitoring, environment handling, local storage behavior, dependency health, cache behavior, production headers, and Git/Vercel ignore rules.

## Threat Model

- Public users can reach the Next.js app and API routes.
- Authenticated support users can create tickets, assign work, and send AI assistant requests.
- Browser input, ticket fields, chat messages, and request headers are untrusted.
- OpenAI, Supabase, and Vercel credentials must remain server-side or in managed provider environment variables.
- Ticket content and AI conversations may contain customer-sensitive support data and must not be globally cached.
- Vercel deployment metadata can be short-cacheable because it is operational state, not customer ticket data.

## Findings

### High Or Critical Findings

No high or critical findings remain after remediation.

### Remediated Findings

- AI auth previously accepted any bearer-shaped token when `REQUIRE_AI_AUTH=true`. It now validates the bearer token with Supabase Auth before allowing protected AI requests.
- `.env.*`, `.venv`, `venv`, `.vercel`, local logs, dependencies, and build outputs are now ignored for Git and Vercel uploads.
- AI responses now return `Cache-Control: no-store, max-age=0`.
- Vercel deployment monitoring returns `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.
- Public API routes now include fixed-window rate limiting headers.
- Production responses now include security headers for HSTS, frame blocking, content-type sniffing protection, referrer policy, and browser permission restrictions.
- Supabase schema now includes indexes for high-traffic ticket, assignment, SLA, and conversation queries.

## Validation Evidence

- `npm run lint` passed.
- `npm run test` passed with 7 tests across 3 test files.
- `npm run build` passed.
- `npm audit --omit=dev` reported `0 vulnerabilities`.
- Secret scan found no committed OpenAI, Supabase, Vercel, or service-role token patterns.
- Git ignore checks confirmed `.env`, `.env.local`, `.env.production`, `.venv`, `venv`, `.vercel`, `.next`, `node_modules`, and server logs are ignored.
- Production server smoke test returned `HTTP 200` for `/`.
- Production server smoke test confirmed `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- Production server smoke test returned `HTTP 200` for `/api/vercel/deployments` with `public, s-maxage=60, stale-while-revalidate=300`.
- Production server smoke test confirmed `/api/ai-support` returns `Cache-Control: no-store, max-age=0`.
- Live Vercel deployment returned `HTTP 200` at `https://ai-support-dashboard-navy.vercel.app`.
- Live Vercel deployment returned `401` for unauthenticated `/api/ai-support` requests.
- Live Vercel deployment returned `401` for fake bearer-token `/api/ai-support` requests.
- Live Vercel project currently has Supabase, OpenAI, Vercel deployment monitoring, and `REQUIRE_AI_AUTH=true` configured in Vercel.
- Live Vercel deployment monitoring returned `source=vercel` with real deployment events.
- No provider secrets are committed to the repository or local project files.

## Remaining Production Hardening

- Keep `REQUIRE_AI_AUTH=true` in Vercel production environment variables.
- Use a distributed limiter such as Upstash Redis, Vercel Firewall, or an API gateway before real million-user traffic.
- Add server-side pagination and query limits before large production ticket volumes.
- Add background SLA notification jobs or webhook workers for production alerting.
- Fetch ticket context server-side for AI requests instead of trusting client-submitted ticket context.
- Add Playwright end-to-end tests against a protected preview deployment.

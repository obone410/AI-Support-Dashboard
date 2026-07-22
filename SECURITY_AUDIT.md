# Security Audit

Last reviewed: June 25, 2026.

## Scope

This audit covers the AI Support Agent Dashboard before public push and deployment. Reviewed areas include Next.js API routes, Supabase schema and row-level security, Vercel deployment monitoring, AI evaluation logging, environment handling, local storage behavior, dependency health, cache behavior, production headers, and Git/Vercel ignore rules.

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
- Production responses now include a Content Security Policy, cross-origin opener/resource policies, origin-agent clustering, DNS prefetch blocking, and cross-domain policy blocking.
- AI assistant requests now reject oversized payloads before parsing and cap OpenAI response tokens.
- Supabase keepalive now runs through a Vercel Cron route that performs multiple read-only, no-store Supabase REST probes and fails closed unless `CRON_SECRET` matches the bearer token.
- Project dependencies were refreshed to the current compatible Next.js 16, React 19, Supabase JS, OpenAI SDK, Tailwind CSS, and Vitest patch lines.
- `npm audit fix` remediated vulnerable transitive dev dependencies including affected Vite, Undici, Babel, and js-yaml versions.
- Supabase schema now includes indexes for high-traffic ticket, assignment, SLA, and conversation queries.
- AI evaluation logs are persisted behind Supabase row-level security and linked to authenticated users.

## Validation Evidence

- `npm run lint` passed.
- `npm run test` passed with 8 tests across 3 test files.
- `npm run build` passed on Next.js 16.2.9.
- `npm audit` reported `0 vulnerabilities`.
- `npm outdated` showed only ESLint 10 newer than the installed ESLint 9.39.4; ESLint 9 is retained because Next's current ESLint plugin stack still declares ESLint 9 peer support.
- Secret-pattern sweep found only empty environment placeholders in `README.md` and no committed OpenAI, Supabase, Vercel, or service-role token values.
- Local production smoke test returned `HTTP 200` for `/` and `/portfolio`, confirmed `Content-Security-Policy`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, the updated resume link, and the platform refresh section.
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
- Live recruiter demo account was seeded with sample tickets, teams, agents, conversation threads, SLA states, and AI evaluation logs.
- No provider secrets are committed to the repository or local project files.

## Remaining Production Hardening

- Keep `REQUIRE_AI_AUTH=true` in Vercel production environment variables.
- Use a distributed limiter such as Upstash Redis, Vercel Firewall, or an API gateway before real million-user traffic.
- Add server-side pagination and query limits before large production ticket volumes.
- Add background SLA notification jobs or webhook workers for production alerting.
- Fetch ticket context server-side for AI requests instead of trusting client-submitted ticket context.
- Add Playwright end-to-end tests against a protected preview deployment.

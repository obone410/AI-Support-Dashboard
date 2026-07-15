# Hermes Handover

Generated: 2026-07-15

This handover is for a Hermes-style operator agent picking up the AI Support Agent Dashboard from the repository. It is intentionally sanitized: it contains public project handles, operational steps, and verification commands, but no provider secrets, bearer tokens, OAuth files, or local-only hidden workspace state.

## Project Snapshot

- Product: AI-assisted support operations dashboard and portfolio project.
- Repository: https://github.com/obone410/AI-Support-Dashboard.git
- Main branch: `main`
- Live production app: https://ai-support-dashboard-navy.vercel.app
- Portfolio page: https://ai-support-dashboard-navy.vercel.app/portfolio
- Vercel project name: `ai-support-dashboard`
- Supabase dashboard display name: `AI support Agent`
- Current stack: Next.js 16, React 19, TypeScript 6, Tailwind CSS 4, Supabase JS 2, OpenAI SDK 6, Zod 4, Vitest 4.

The local project may contain provider link metadata such as `.vercel/project.json`, but `.vercel` is ignored and should not be committed. On a fresh machine, relink with the authorized Vercel account rather than relying on hidden local files.

## Current Known State

- Git was clean and synchronized with `origin/main` after the latest heartbeat check.
- Latest pushed project commit before this handover: `598e691 Secure Supabase keepalive cron`.
- Production Vercel deployment was previously verified as ready and serving the live alias.
- Supabase project was verified as `ACTIVE_HEALTHY`.
- Manual Supabase REST heartbeat succeeded on 2026-07-15 at `12:45:26Z` with `200 OK`.
- Supabase API logs confirmed `GET | 200 | /rest/v1/profiles?select=id&limit=1 | codex-manual-heartbeat`.
- Automatic keepalive cron is configured in `vercel.json`:

```json
{
  "path": "/api/cron/supabase-keepalive",
  "schedule": "0 8 * * *"
}
```

Vercel Cron runs this daily at `08:00 UTC`, which is about `09:00` in Africa/Lagos. The endpoint requires `CRON_SECRET` and fails closed when the bearer token is missing or wrong.

## Important Files

- `README.md`: product overview, live demo, architecture, deployment notes, environment variables, and operations guidance.
- `SECURITY_AUDIT.md`: security status, remediated findings, validation evidence, and remaining hardening items.
- `vercel.json`: Vercel cron configuration for the Supabase keepalive.
- `supabase/schema.sql`: current database schema source.
- `supabase/migrations/20260514232603_initial_support_dashboard_schema.sql`: tracked migration.
- `src/app/api/cron/supabase-keepalive/route.ts`: protected Supabase keepalive endpoint.
- `src/app/api/cron/supabase-keepalive/route.test.ts`: keepalive route tests.
- `src/app/api/ai-support/route.ts`: server-side OpenAI support assistant route.
- `src/app/api/vercel/deployments/route.ts`: server-side Vercel deployment monitoring route.
- `src/components/support-dashboard.tsx`: main dashboard UI.
- `public/resume/`: resume assets used by the portfolio page.

## Pull-Up Checklist For Hermes

1. Clone or update the repo:

```bash
git clone https://github.com/obone410/AI-Support-Dashboard.git
cd AI-Support-Dashboard
git pull --ff-only origin main
```

2. Install dependencies:

```bash
npm install
```

3. Review environment requirements:

```bash
cp .env.example .env.local
```

Fill local values only when needed. Never commit `.env`, `.env.*`, `.vercel`, tokens, provider keys, or pulled production env files.

4. Run local verification:

```bash
npm run lint
npm run test
npm run build
npm audit
```

5. Run locally:

```bash
npm run dev
```

Then open `http://localhost:3000`. The app has demo-mode fallbacks when provider variables are absent.

## Deployment Notes

- GitHub is the source of truth for code.
- Vercel is connected to the `ai-support-dashboard` project and should deploy from `main`.
- Production provider secrets live in Vercel environment variables, not in Git.
- Required production variables are documented in `README.md`; do not print or commit actual values.
- If relinking Vercel locally, use the authorized workspace owner account and the existing `ai-support-dashboard` project.
- After pushing to `main`, verify the production app and portfolio page return `200`.

Recommended production smoke checks:

```bash
curl -I https://ai-support-dashboard-navy.vercel.app
curl -I https://ai-support-dashboard-navy.vercel.app/portfolio
curl -I https://ai-support-dashboard-navy.vercel.app/api/vercel/deployments
```

The cron route is intentionally protected. Do not make it public just to test it. Test through Vercel Cron logs, an authorized `CRON_SECRET` request, or a direct Supabase read probe with approved credentials.

## Supabase Heartbeat Workflow

Purpose: keep the Supabase Free Plan project active by producing lightweight legitimate activity without creating junk rows.

Automatic path:

- Vercel Cron calls `/api/cron/supabase-keepalive` once per day.
- The route checks `Authorization: Bearer <CRON_SECRET>`.
- The route performs a read-only Supabase REST probe against `profiles?select=id&limit=1`.
- Responses are `Cache-Control: no-store`.

Manual verification options:

- Preferred with Supabase connector: run a simple SQL read such as:

```sql
select
  current_timestamp as heartbeat_at,
  current_database() as database_name,
  current_user as executed_as,
  (select count(*) from public.profiles) as profile_count;
```

- Preferred with production app access: call the cron endpoint only with the encrypted Vercel `CRON_SECRET` value available through an approved secure workflow.
- If using `vercel env pull` for temporary local verification, pull into a temp file, do not print secrets, and delete the temp file immediately after use.

Supabase Free Plan note: this heartbeat reduces inactivity-pause risk, but the only guaranteed way to avoid Supabase Free Plan pausing is a paid Supabase plan.

## Security Boundaries

Keep these rules intact:

- `OPENAI_API_KEY`, `VERCEL_TOKEN`, `CRON_SECRET`, and Supabase secret/service-role keys must never enter client code or Git.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is public-client scoped, but still should not be casually pasted into logs or docs.
- Keep `REQUIRE_AI_AUTH=true` in production.
- Keep `/api/ai-support` responses `no-store`.
- Keep `/api/cron/supabase-keepalive` protected by `CRON_SECRET`.
- Do not bypass Supabase row-level security to solve ordinary permission errors.
- Do not add real write APIs for admin/team mutations without server-side authorization checks.

## Recent Work Completed

- Portfolio resume was updated to match the newer resume assets.
- Stack and security refresh landed across Next.js, React, Tailwind, Supabase JS, OpenAI SDK, and testing dependencies.
- Security headers, rate limiting, request validation, and cache behavior were hardened.
- Supabase schema and tracked migration were aligned.
- Vercel Cron keepalive was added, then hardened to require `CRON_SECRET`.
- Production Supabase keepalive was manually verified after deployment.

## Remaining Good Next Tasks

- Add Playwright end-to-end tests for production login/demo flow, portfolio resume link, AI route auth, and deployment monitoring.
- Move API rate limiting from in-memory state to a distributed store or Vercel Firewall before serious traffic.
- Fetch AI ticket context server-side instead of trusting client-submitted ticket context.
- Add server-side admin authorization before creating real team/agent mutation APIs.
- Add Vercel webhook ingestion for real-time deployment updates.
- Add a lightweight scheduled monitor that records heartbeat results in an external observability system without writing junk app data.

## Sanitized Hermes Import Summary

- Candidate workflow name: `ai-support-dashboard-ops-handoff`
- Public inputs required: GitHub repo URL, live production URL, existing provider project names, documented env var names, and repo files.
- Private inputs removed: local absolute workspace paths, provider secret values, bearer tokens, OAuth files, and raw hidden deployment metadata.
- Remaining risks: production verification still depends on authorized provider access; Free Plan heartbeat reduces but does not guarantee avoidance of Supabase inactivity pauses.
- Files created or updated by this handover: `docs/HERMES_HANDOVER.md`.

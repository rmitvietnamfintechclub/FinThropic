# Operations

How the app is deployed, rolled back and protected. Owner: Backend 2 (runbook), Project Leader (secrets).

## Environments

| Environment | Where | Built from | Supabase project | Keys |
| --- | --- | --- | --- | --- |
| Local | `bun run dev` on a laptop | working copy | test project, or local `supabase start` | `web/.env.local` (git-ignored), copied from `.env.example` |
| Preview | Vercel preview URL, one per pull request | every push to a PR branch | **test** project | Preview variables in Vercel: test URL, test anon key, test secret key, a separate Gemini key with a low quota |
| Production | Vercel production URL (custom domain later, PBI-025) | `main` after a merge | **production** project | Production variables in Vercel; the production secret key exists only here |

Rules:
- Preview and Production variables are separate in Vercel. A preview never holds a production key.
- `NEXT_PUBLIC_*` values reach the browser; only the Supabase URL and anon key may be public. `SUPABASE_SECRET_KEY` and `GEMINI_API_KEY` stay on the server; `bun run check:bundle` fails the build if one reaches the browser output.
- The app stops at start if a variable is missing or malformed (`server/config/env.ts`), so a misconfigured deploy fails loudly instead of running half-configured.

## Vercel project settings

| Setting | Value | Why |
| --- | --- | --- |
| Root Directory | `web` | the Next.js app lives there |
| Framework | Next.js (detected) | |
| Install Command | detected from `bun.lock` (`bun install`); if not, `bun install --frozen-lockfile` | same lockfile as CI (ADR 0002) |
| Node.js version | 22.x (from `engines.node` in `web/package.json`, which overrides the dashboard) | same major as `.node-version` and CI |
| Production branch | `main` | trunk-based |
| Preview deployments | on for every PR; the Vercel bot comments the URL on the PR | reviewers test the real build. On Vercel Hobby a private repository deploys only the Vercel account owner's commits; other authors need Vercel Pro or a deploy from GitHub Actions (ADR 0012) |
| Git fork protection | on | a fork PR cannot read our variables |
| Custom domain | none yet (PBI-025) | |

HTTPS is forced by Vercel (308 redirect). `*.vercel.app` sends `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`; a custom domain gets `max-age=63072000` for its own host. The app adds the other security headers itself (`web/next.config.ts`, ADR 0010).

## Check a deployment

```
curl -sI https://<deployment-url>/ | grep -iE "strict-transport|x-content-type|x-frame|referrer|permissions"
curl -s https://<deployment-url>/api/health
```
Expected: the four app headers plus HSTS; `/api/health` returns 200 with `"status":"ok"`.

## Roll back production

1. Vercel dashboard, project, Deployments: find the last good production deployment.
2. Menu on that deployment, **Instant Rollback** (or **Promote to Production**). The domain points at it within seconds; nothing is rebuilt.
3. Open a `fix:` pull request for the cause (or revert the bad commit on `main`). Instant Rollback turns off automatic production deploys until a new deployment is promoted, so promote the fixed deployment when it is ready.
4. Write what happened in the sprint notes.

A database migration is not undone by a rollback. Migrations are forward only: fix with a new migration.

## A secret leaked

Act in this order; do not wait to find out whether someone used it.
1. **Rotate** the key at its source: Supabase dashboard (API keys) or Google AI Studio (Gemini). The old key stops working.
2. **Replace** it in Vercel (the right environment only) and redeploy; update local `.env.local` files.
3. **Remove** it from wherever it appeared (chat, PR comment, log). If it was committed, rewriting history does not make it safe: the rotation in step 1 is what protects us.
4. **Check** Supabase logs and the Gemini usage page for use since the leak.
5. **Record** what leaked, when, and what was rotated, and tell the Project Leader. Repeat for each environment the key was in.

gitleaks in CI is the only automatic secret check (GitHub push protection is not available on this private repository, ADR 0012), and it runs after the push: rotate first, then clean up.

## Access

- Vercel: the club team owns the project. Members get access through the team, never through a shared password.
- Supabase: production access for the Project Leader and Backend 1 only; everyone else works on the test project.
- Account passwords stay in the club's account document, never in the repository, issues or chat.

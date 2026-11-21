# Operations

How the app is deployed, rolled back and protected. Owner: Backend 2 (runbook), Project Leader (secrets).

## Environments

| Environment | Where | Built from | Supabase project | Keys |
| --- | --- | --- | --- | --- |
| Local | `bun run dev` on a laptop | working copy | test project, or local `supabase start` | `web/.env.local` (git-ignored), copied from `.env.example` |
| Preview | none by default; the club account can deploy a branch by hand when a reviewer needs it | a branch, on request | **test** project | Preview variables in Vercel: test URL, test anon key, test secret key, a separate Gemini key with a low quota |
| Production | https://finthropic.vercel.app (custom domain `finthropic.rmitvietnamfintechclub.com` later, PBI-025) | `main`, deployed by hand by the club account (below) | **production** project | Production variables in Vercel; the production secret key exists only here |

Rules:
- Preview and Production variables are separate in Vercel. A preview never holds a production key.
- `NEXT_PUBLIC_*` values reach the browser; only the Supabase URL and anon key may be public. `SUPABASE_SECRET_KEY` and `GEMINI_API_KEY` stay on the server; `bun run check:bundle` fails the build if one reaches the browser output.
- The app stops at start if a variable is missing or malformed (`server/config/env.ts`), so a misconfigured deploy fails loudly instead of running half-configured.

## Local database

Each developer runs Supabase on their own machine with the Supabase CLI and Docker. The schema comes only from `supabase/migrations/`, so every local database is the same.

Requirements: Docker running (Docker Desktop or OrbStack) and the Supabase CLI (`brew install supabase/tap/supabase`; other systems: the Supabase CLI install page).

Run from the repository root:

| Task | Command | Note |
| --- | --- | --- |
| Start | `supabase start` | the first start downloads the images and takes a few minutes; prints the API URL, keys and Studio URL |
| Show the URL and keys again | `supabase status` | |
| Reset | `supabase db reset` | drops the local database, applies every migration in order, then `supabase/seed.sql` |
| Run database tests | `supabase test db` | pgTAP tests in `supabase/tests/` |
| Stop | `supabase stop` | keeps the data; `supabase stop --no-backup` deletes it |

Studio (the local dashboard) runs at http://127.0.0.1:54323 while Supabase is started.

To point the app at the local database, copy `web/.env.example` to `web/.env.local` and fill it from `supabase status`: `NEXT_PUBLIC_SUPABASE_URL` = API URL, `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon (publishable) key, `SUPABASE_SECRET_KEY` = service_role (secret) key. These local keys are not secrets of any real project, but `.env.local` is still never committed.

Rules:
- Migrations are forward only: never edit a merged migration; fix it with a new one.
- `supabase/seed.sql` holds synthetic data only: no real emails, names or club documents.

## Vercel project settings

Project `finthropic` in the club's Vercel account (team "rmitvietnamfintechclub's projects", Hobby plan), connected to this repository. The club domain `rmitvietnamfintechclub.com` is managed in the same account (Vercel DNS), so the custom domain needs no DNS change outside Vercel. Until Supabase and Gemini keys exist (PBI-002, PBI-004), all four variables hold placeholders.

| Setting | Value | Why |
| --- | --- | --- |
| Root Directory | `web` | the Next.js app lives there |
| Framework | Next.js (detected) | |
| Install Command | detected from `bun.lock` (`bun install`); if not, `bun install --frozen-lockfile` | same lockfile as CI (ADR 0002) |
| Node.js version | 22.x (from `engines.node` in `web/package.json`, which overrides the dashboard) | same major as `.node-version` and CI |
| Production branch | `main` | trunk-based |
| Automatic deployments | off (`web/vercel.json`, `git.deploymentEnabled: false`) | set while the repository was private, when Vercel Hobby deployed only the account owner's commits (ADR 0012); kept off after the repository became public (ADR 0013), revisit |
| Git fork protection | on | a fork PR cannot read our variables |
| Deployment protection | Vercel Authentication on preview and deployment URLs; the production URL is public | a preview link opens only for someone signed in to the club's Vercel account; share one with a Shareable Link |
| Custom domain | none yet (PBI-025) | |

HTTPS is forced by Vercel (308 redirect). `*.vercel.app` sends `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`; a custom domain gets `max-age=63072000` for its own host. The app adds the other security headers itself (`web/next.config.ts`, ADR 0010).

## Deploy production

Done by someone signed in to the club's Vercel account, when `main` has something worth releasing (at least at the Sunday sprint tag):
1. Vercel dashboard, project `finthropic`, Deployments, **Create Deployment**, branch `main`.
2. Wait for Ready, then run the checks below on https://finthropic.vercel.app.

A branch can be deployed the same way as a preview (with Preview variables) when a reviewer needs to click through a change.

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

GitHub push protection blocks a push that contains a known secret format, and gitleaks in CI scans every pull request after the push (ADR 0013). If either fires: rotate first, then clean up.

## Access

- Vercel: the club team owns the project. Members get access through the team, never through a shared password.
- Supabase: production access for the Project Leader and Backend 1 only; everyone else works on the test project.
- Account passwords stay in the club's account document, never in the repository, issues or chat.

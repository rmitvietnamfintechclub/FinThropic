# FinThropic

The RMIT Vietnam FinTech Club assistant. Members ask questions in English or Vietnamese and get answers taken only from the club's own documents, with a citation to the page or section each fact came from. Admins upload documents and control who can read them. One Next.js app on Vercel, Supabase for the database, search and sign-in, and a Python job that turns documents into searchable chunks.

## Run it in 5 minutes

You need Node 22 (`.node-version`), Bun 1.3, Python 3.12 and Git.

```bash
git clone https://github.com/rmitvietnamfintechclub/FinThropic.git
cd FinThropic/web
cp .env.example .env.local      # fill in the test values from the Project Leader; never commit this file
bun install
bun run dev                     # http://localhost:3000 shows "Server is up"
```

The app refuses to start if a variable in `.env.local` is missing or malformed, and names the variable. Until the Supabase project exists (PBI-002), any valid URL and non-empty strings are enough for the home page and `/api/health`.

Python worker:

```bash
cd ingest
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
pytest -q
```

## Commands

From `web/`:

| Command | What it does |
| --- | --- |
| `bun run dev` | start the app with hot reload |
| `bun run format` / `format:check` | format with Prettier / check only |
| `bun run lint` | ESLint (medium strict, ADR 0004) |
| `bun run typecheck` | TypeScript, no output |
| `bun run arch` | architecture rules (dependency-cruiser, ADR 0007) |
| `bun run test` | Vitest |
| `bun run build` then `bun run check:bundle` | production build, then check no secret reached the browser output |

From `ingest/`: `ruff check .`, `ruff format --check .`, `mypy`, `pytest -q`.

CI runs all of these on every pull request, plus the PR title check, a secret scan and CodeQL.

## Where things are

| Area | Folders | Read |
| --- | --- | --- |
| Frontend | `web/src/app/` (pages), `web/src/components/<group>/<Package>/`, `web/src/common/ui/` (shared UI) | `docs/ARCHITECTURE.md`, frontend section |
| Backend | `web/src/server/modules/` (auth, accounts, documents, chat, audit, admin), `web/src/server/middlewares/`, `supabase/` (from PBI-002) | `docs/ARCHITECTURE.md`, backend section; `docs/ENDPOINTS.md`; `docs/MODELS.md` |
| AI | `web/src/server/modules/chat/rag/`, `web/src/server/ai/` (answering), `ingest/` (indexing), `eval/` (from PBI-012) | `docs/ARCHITECTURE.md`, AI section |
| Shared | `web/src/contracts/` (data shapes both sides agree on), `.github/`, `docs/` | `docs/CODING_STANDARD.md`, `docs/adr/` |

Working examples to copy: `web/src/components/health/HealthBadge/` (frontend package), `web/src/server/modules/health/` (backend module), `web/src/contracts/health.dto.ts` (contract). Owners of every folder: `docs/ARCHITECTURE.md`, "Repository folders and owners".

## How to work on a task

Read `CONTRIBUTING.md`. In short: take your sub-issue, branch `feat/<issue-number>-short-name` from the latest `main`, keep it to 1 or 2 days, open a small pull request with the template, CI green, one review, squash merge. Merge by Saturday 23:59 (Vietnam time); `main` is tagged `sprint-N` on Sunday.

There are no automatic preview deployments: check your change locally with `bun run dev`. Production (https://finthropic.vercel.app) is deployed from `main` by hand (`docs/OPERATIONS.md`).

## Rules that never bend

- Never commit a secret. Keys live in `.env.local` (local) and in Vercel (deployed). If one leaks, follow `docs/OPERATIONS.md` and rotate it first.
- The Supabase secret key is used only by the admin client and the worker, never in code a member's request runs through, and never in the browser.
- Real club documents never go into git. Test files are synthetic (`fixtures/`); real ones stay in the git-ignored `fixtures/private/`.
- Do not work around an architecture or lint rule. If a rule is wrong, propose an ADR.
- Security issues: see `SECURITY.md`, not a public issue.

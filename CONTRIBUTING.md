# Contributing

Read `README.md` (run it, where things are) and `docs/CODING_STANDARD.md` (rules). We work trunk-based: one `main` branch that always works, and short branches that go back into it quickly.

## For every task
1. Take a sub-issue assigned to you. Read **Baseline** (must pass) and **Open point** (where you may do better; the recommendation is unverified, research it).
2. Every morning, pull the latest `main`. Create your branch from it: `feat/<issue-number>-short-name`. One branch per sub-issue.
3. Keep the branch short: merge it within 1 to 2 days. If the task needs longer, split it into smaller sub-issues. Never keep one long branch per person or per role.
4. Commit with Conventional Commits, small commits, one logical change each.
5. Before you push: `cd web && bun run format && bun run lint && bun run typecheck && bun run arch && bun run test`
   (Python: `cd ingest && ruff check . && ruff format --check . && mypy && pytest`).
6. Open a small pull request with the template and `Closes #<issue-number>`. CI must pass, one other person reviews, then squash merge. The PR title follows Conventional Commits. The branch is deleted after the merge.
7. Fill "Open point: tried, found, chose" even if you kept the baseline.

## Rules
- Nobody pushes to `main` and nobody force pushes. GitHub does not block it on this private repository (ADR 0012), so this is a team rule: CI on `main` shows who broke it. There are no branches per role, per person or per sprint.
- `main` always works. Work that is not finished before the sprint ends goes in behind a feature flag, switched off.
- If you change a file in a folder owned by another role (see `docs/ARCHITECTURE.md`), say so in the PR. The owner reviews it. Keep the change minimal.
- Reviews: the person in your role pair reviews. The Project Leader reviews auth, Row Level Security and permissions, `.github/`, architecture rules, ADRs and migrations (routed by CODEOWNERS).

## Sprint rhythm
- A sprint is one week, Monday to Sunday. Merge your pull requests by **Saturday 23:59** (Vietnam time).
- Sunday evening: the Project Leader checks `main` and tags it `sprint-N` (for example `sprint-1`).
- Monday: retrospective of the week that ended, then planning of the next sprint.

Never commit secrets or real club documents. See `SECURITY.md`.

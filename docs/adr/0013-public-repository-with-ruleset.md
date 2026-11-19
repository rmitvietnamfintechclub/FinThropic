# 0013 Public repository with a merge ruleset

Status: accepted
Date: 2026-11-19   Decided by: Project Leader   Supersedes: ADR 0012

## Context
ADR 0012 kept the repository private on the Free plan, where GitHub enforces no rules on `main`. Nothing in the repository needs to be private: real club documents stay in the git-ignored `fixtures/private/`, secrets stay in Vercel and `.env.local`, and gitleaks found no secret in the whole history. On a public repository GitHub enforces rulesets, secret scanning, push protection, private vulnerability reporting and CodeQL at no cost.

## Decision
The repository is public (option 1 of ADR 0012). A ruleset on `main`:
- changes reach `main` only through a pull request with 1 approval; an approval is dismissed when new commits are pushed;
- the CI checks `pr-title`, `secrets`, `web`, `ingest` and `database` must pass;
- no force push and no deletion of `main`.

Squash merge only, head branches deleted after merge, Dependabot alerts and security updates on (unchanged). Secret scanning, push protection and private vulnerability reporting are on.

## Consequences
- A pull request without an approval cannot be merged. Ask your role pair early; plan for review time before Saturday 23:59.
- CODEOWNERS now requests reviews automatically.
- The CodeQL workflow runs (it skips itself only on a private repository).
- GitHub Actions minutes are free on a public repository.
- Anyone can read the code and the issues: never paste a secret, a member's personal data or club document content into an issue, a PR or a commit.
- Automatic Vercel deployments stay off and `main` is still deployed by hand (`docs/OPERATIONS.md`); revisit separately.

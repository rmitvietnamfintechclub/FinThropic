# 0012 Private repository with light merge rules

Status: accepted
Date: 2026-11-15   Decided by: Project Leader (repository private as agreed with the Head of Technology on 14/11)

## Context
The repository belongs to the club's personal GitHub account (`rmitvietnamfintechclub`, not an organisation) on the Free plan. The club wants the code private during development. On a private repository of a Free personal account GitHub does not enforce branch rulesets or code owners (GitHub Pro needed), and secret scanning, push protection, private vulnerability reporting and CodeQL are not available. A required approval would also block the Project Leader's own pull requests, because only the account owner can be on a bypass list.

## Options
1. Public repository with a ruleset (pull request, checks, one approval): strongest protection, but the code is public.
2. Private repository on a paid plan (GitHub Pro for the account, or move to an organisation on GitHub Team): rules enforced, costs money.
3. Private repository on the Free plan, rules kept by the team and CI: no cost, protection depends on discipline.

## Decision
Option 3. No required approvals. Squash merge only (PR title as the commit), head branches deleted after merge, Dependabot alerts and security updates on.
Team rules that GitHub does not enforce here: work through pull requests, merge only with CI green, never push to `main`, never force push. Reviews follow `CONTRIBUTING.md`; CODEOWNERS documents who should review but does not request reviews on this plan.

## Consequences
- The safety net is CI: format, lint, types, architecture rules, tests, build, bundle secret check, and gitleaks on every pull request and every push to `main`. A red check after a direct push must be fixed at once.
- No GitHub secret scanning or push protection: gitleaks in CI is the only automatic secret check, and it runs after the push. Rotate first if it fires (`docs/OPERATIONS.md`).
- The CodeQL workflow skips itself while the repository is private.
- Private vulnerability reporting is off: security reports go to the Project Leader directly (`SECURITY.md`).
- GitHub Actions on a private repository uses the account's free minutes (2,000 a month on the Free plan).
- Vercel Hobby deploys a private repository only for commits by the Vercel account owner, so automatic deployments are off and the club account deploys `main` by hand (`docs/OPERATIONS.md`). No preview per pull request.
- Revisit if the team grows, a direct push breaks `main`, or the repository becomes public (then option 1).

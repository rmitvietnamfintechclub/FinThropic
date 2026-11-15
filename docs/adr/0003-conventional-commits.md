# 0003 Conventional Commits and squash merge

Status: accepted
Date: 2026-11-15   Decided by: Project Leader

## Context
Seven people commit to one `main` branch (trunk-based, see `CONTRIBUTING.md`). History must say what changed and where, without reading every diff.

## Options
1. Conventional Commits 1.0.0, checked on the PR title, with squash merge: one readable line per PR on `main`.
2. Free-form messages: no rule to learn, history hard to scan.
3. Conventional Commits on every commit with a commit hook: stricter, but slows small commits and is easy to bypass locally.

## Decision
Option 1. The PR title follows `type(scope): description` (types `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`, `perf`; scopes such as `web`, `ingest`, `db`). CI checks it; squash merge makes it the commit on `main`.

## Consequences
History and changelogs are easy to read, and a breaking change is marked with `!`. Commits inside a branch can be messy; only the PR title must be right.

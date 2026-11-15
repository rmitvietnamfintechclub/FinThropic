# 0004 Lint strictness: medium

Status: accepted
Date: 2026-11-15   Decided by: Project Leader

## Context
Too loose lets bugs through; too strict slows a team new to the stack.

## Options
1. Loose: Next.js defaults only.
2. Medium: Next.js core-web-vitals and typescript-eslint recommended, plus a few rules that catch real bugs.
3. Strict: typescript-eslint strict and type-aware rules on every file.

## Decision
Option 2. TypeScript `strict: true`. ESLint with Next.js core-web-vitals and typescript-eslint recommended, plus: no unused
variables (`_` prefix allowed for arguments), consistent type imports, `eqeqeq`, `no-console` as a warning (`warn` and
`error` allowed). Prettier formats every file; `eslint-config-prettier` turns off the style rules that would clash with it.

## Consequences
Catches common mistakes without long fights. Revisit after Sprint 3 if the same bug classes keep reaching review.

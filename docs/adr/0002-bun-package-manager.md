# 0002 Bun as package manager, Node 22 as runtime

Status: accepted
Date: 2026-11-15   Decided by: Project Leader

## Context
We need one fast, reproducible way to install packages and run scripts, the same on every laptop, in CI and on Vercel.

## Options
1. Bun for install and scripts, Node for Next.js: fast installs, one text lockfile (`bun.lock`).
2. npm: slower, but the default everywhere.
3. pnpm: fast and strict, one more tool to install.

## Decision
Bun 1.3 for `install` and scripts; `bun.lock` is committed and CI installs with `--frozen-lockfile`. Next.js runs on Node. Node 22 is pinned in `.node-version` and `engines`, because `dependency-cruiser` needs Node 22 or newer (ADR 0007); `@types/node` stays on major 22 (Dependabot ignores its majors).

## Consequences
Fast installs and a CI cache keyed on `bun.lock`. Never mix `npm install` and Bun in the same folder. Vercel must detect Bun from `bun.lock` (checked in PBI-046.2).

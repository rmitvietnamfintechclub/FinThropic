# 0005 Two Supabase clients

Status: accepted
Date: 2026-11-15   Decided by: Project Leader

## Context
The secret key bypasses Row Level Security. If a member-facing request used it, permissions would silently stop working.

## Options
1. One client with the secret key, permissions checked in code only.
2. Two clients: one with the member's token (Row Level Security applies), one with the secret key for admin jobs and the worker.

## Decision
Option 2. `createUserClient(token)` for everything a member triggers. `createAdminClient()` only for admin jobs and the
worker. Both are server-only, keep no session and do not refresh tokens. SQL search functions are `security invoker`.

## Consequences
Every permission test must call the endpoint with a Member token and check that EBMB content never appears. A review that
finds `createAdminClient()` in a member request path blocks the merge.

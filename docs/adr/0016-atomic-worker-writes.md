# 0016 Atomic worker writes

Status: accepted
Date: 2026-11-24   Decided by: Quoc Khanh (Project Leader)

## Context
The indexing worker sets a document's status, error and warnings and replaces its chunks. A status
that says `ready` while half the chunks are missing, or old chunks left behind by a failed run,
would make search return a half-indexed document. PostgREST sends one statement per request, so
two calls cannot share a transaction.

## Options
1. Two PostgREST calls (PATCH the document, then POST the chunks): simple, but a crash between them
   leaves a wrong status or half a document, and the old chunks stay.
2. `supabase-py`: one statement per request under the hood, so it does not add a transaction across
   calls, and it brings four packages for one endpoint.
3. One Postgres function called with `rpc()`: the delete, insert and status update run in one
   transaction; the worker sends one `httpx` POST, and the re-index path (#82) reuses the function.

## Decision
Option 3. `replace_document_chunks(p_document_id, p_status, p_error, p_warnings, p_chunks)` is a
`security invoker` function with `set search_path = public`; execute is revoked from `public`,
`anon` and `authenticated` and granted to `service_role` only. The worker calls it with `httpx`
(`POST /rest/v1/rpc/replace_document_chunks`, `apikey` and `Authorization: Bearer`), so no new
Python client is added. `mark_processing` and `mark_failed` stay plain PATCH calls; they touch one
table.

## Consequences
- A failed insert rolls back the delete and the status change; the old chunks survive.
- The worker needs the secret key; a signed-in member cannot call the function.
- #82 reuses the function for re-indexing instead of adding a second write path.
- Future worker writes that touch more than one table follow the same pattern; single-table writes
  stay plain PostgREST calls.

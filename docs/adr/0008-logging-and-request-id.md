# 0008 Structured logging and request id

Status: accepted
Date: 2026-11-15   Decided by: Project Leader

## Decision
One JSON line per event (debug and info to stdout, warn and error to stderr) from `web/src/server/utils/logger.ts` (no dependency; levels via `LOG_LEVEL`). `withErrorHandler` gives every request an id
(`x-request-id`, kept if the caller sent one), logs unhandled errors with it, and returns it in the response and in 500 bodies.
Never log secrets, tokens, passwords, member questions or document text. Log ids and counts instead.

## Consequences
A member can quote the request id and we can find the error line on Vercel. If volume grows, swap the logger internals (for example pino) without changing callers.
Pilot monitoring (PBI-036.1) stores outcome, top score, retrieved chunk ids, tokens and cost on the `messages` row, not in the logs, so no member question ever reaches a log line.

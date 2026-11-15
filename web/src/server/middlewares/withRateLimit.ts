import "server-only";
import type { Handler } from "./withErrorHandler";

// Limits calls per person so one user cannot spend the AI budget or guess passwords. Owner: Backend 2.
// FAIL CLOSED until implemented.
export function withRateLimit(_perMinute: number, _handler: Handler): Handler {
  return async () =>
    Response.json({ error: "not_implemented", detail: "withRateLimit" }, { status: 501 });
}

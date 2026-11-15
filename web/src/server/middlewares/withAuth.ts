import "server-only";
import type { Handler } from "./withErrorHandler";

// Rejects a request without a valid, active session. Owner: Backend 1 (PBI-015, PBI-017).
// FAIL CLOSED: until the auth module is wired in, every request is refused with 501.
// A route wrapped by this stub must never look protected while it is open.
export function withAuth(_handler: Handler): Handler {
  return async () =>
    Response.json({ error: "not_implemented", detail: "withAuth" }, { status: 501 });
}

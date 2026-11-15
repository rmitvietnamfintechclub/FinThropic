import "server-only";
import type { Handler } from "./withErrorHandler";

// Allows the route only for the listed roles. Owner: Backend 1 (PBI-017, PBI-018).
// FAIL CLOSED until implemented. Every route that uses it needs a permission test: who may call it, who may not.
export type Role = "member" | "ebmb" | "admin";

export function withRole(_allowed: Role[], _handler: Handler): Handler {
  return async () =>
    Response.json({ error: "not_implemented", detail: "withRole" }, { status: 501 });
}

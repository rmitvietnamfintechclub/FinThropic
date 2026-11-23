import { describe, expect, it } from "vitest";
import { withAuth } from "./withAuth";
import { withRateLimit } from "./withRateLimit";
import { withRole } from "./withRole";

const open = async () => new Response("secret data");
const request = new Request("http://localhost/x");
const context = { requestId: "r1" };

// A stub that lets requests through would make an unprotected route look protected.
describe("security middleware stubs fail closed", () => {
  it("withAuth refuses", async () =>
    expect((await withAuth(open)(request, context)).status).toBe(501));
  it("withRole refuses", async () =>
    expect((await withRole(["admin"], open)(request, context)).status).toBe(501));
  it("withRateLimit refuses", async () =>
    expect((await withRateLimit(10, open)(request, context)).status).toBe(501));
});

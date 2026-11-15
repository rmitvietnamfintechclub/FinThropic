import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { withErrorHandler } from "./withErrorHandler";

const request = (headers: Record<string, string> = {}) =>
  new Request("http://localhost/x", { headers });

describe("withErrorHandler", () => {
  it("adds a request id to a good response", async () => {
    const response = await withErrorHandler(async () => new Response("ok"))(request());
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("keeps the incoming request id", async () => {
    const response = await withErrorHandler(async () => new Response("ok"))(
      request({ "x-request-id": "abc" }),
    );
    expect(response.headers.get("x-request-id")).toBe("abc");
  });

  it("returns 400 for invalid input", async () => {
    const handler = withErrorHandler(async () => {
      z.string().parse(1);
      return new Response();
    });
    expect((await handler(request())).status).toBe(400);
  });

  it("returns 500 with the request id and no stack trace for an unknown error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withErrorHandler(async () => {
      throw new Error("boom");
    });
    const response = await handler(request({ "x-request-id": "r1" }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "internal_error", requestId: "r1" });
  });

  it("rethrows Next.js control-flow errors", async () => {
    const handler = withErrorHandler(async () => {
      throw Object.assign(new Error("redirect"), { digest: "NEXT_REDIRECT" });
    });
    await expect(handler(request())).rejects.toThrow("redirect");
  });
});

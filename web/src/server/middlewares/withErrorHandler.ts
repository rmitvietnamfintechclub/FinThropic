import "server-only";
import { ZodError } from "zod";
import { logger } from "@/server/utils/logger";

// Request wrapper: gives every request an id, turns thrown errors into clean JSON, never a stack trace.
// The id comes from the incoming x-request-id header or is created here, and is returned in the response
// so a member can quote it when reporting a problem.
export type Handler = (request: Request) => Promise<Response>;

const SAFE_REQUEST_ID = /^[A-Za-z0-9-]{1,64}$/;

function isNextControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return (
    typeof digest === "string" && (digest.startsWith("NEXT_") || digest === "DYNAMIC_SERVER_USAGE")
  );
}

function withRequestId(response: Response, requestId: string): Response {
  const headers = new Headers(response.headers);
  headers.set("x-request-id", requestId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function withErrorHandler(handler: Handler): Handler {
  return async (request) => {
    const incoming = request.headers.get("x-request-id");
    // Keep a caller's id only if it is short and plain, so it cannot inject text into logs or headers.
    const requestId = incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();
    try {
      return withRequestId(await handler(request), requestId);
    } catch (error) {
      // Next.js uses thrown errors for its own control flow (redirects, "this route is dynamic"). Never swallow them.
      if (isNextControlFlow(error)) throw error;
      if (error instanceof ZodError) {
        return withRequestId(
          Response.json({ error: "invalid_request" }, { status: 400 }),
          requestId,
        );
      }
      logger.error("unhandled error", {
        requestId,
        path: new URL(request.url).pathname,
        error: error instanceof Error ? error.message : String(error),
      });
      return withRequestId(
        Response.json({ error: "internal_error", requestId }, { status: 500 }),
        requestId,
      );
    }
  };
}

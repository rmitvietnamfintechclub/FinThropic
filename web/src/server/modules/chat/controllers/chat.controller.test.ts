import { describe, expect, it, vi } from "vitest";
import { chatAnswerDtoSchema } from "@/contracts/chat.dto";
import { ProviderError } from "@/server/ai/errors";
import { withErrorHandler } from "@/server/middlewares/withErrorHandler";
import type { ChatService } from "../interfaces/chat.interface";
import { createChatController } from "./chat.controller";

const CHUNK_ID = "0b7c1a52-9a3e-4f43-8d0e-6f1d2c3b4a51";

const answered: Awaited<ReturnType<ChatService["ask"]>> = {
  text: "The membership fee is paid each semester [1].",
  citations: [{ number: 1, chunkId: CHUNK_ID, documentName: "Club handbook", page: 3 }],
  outcome: "answered",
};

/** The route as Next.js runs it: the controller inside withErrorHandler. */
function route(service: ChatService, enabled = true) {
  return withErrorHandler(createChatController(service, () => enabled));
}

function fakeService(result: Awaited<ReturnType<ChatService["ask"]>> = answered) {
  return { ask: vi.fn<ChatService["ask"]>().mockResolvedValue(result) };
}

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/chat", () => {
  it("returns the answer object, with the request id in the body and the header", async () => {
    const service = fakeService();
    const response = await route(service)(
      post({ question: "What is the fee?" }, { "x-request-id": "req-1" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ...answered, requestId: "req-1" });
    expect(response.headers.get("x-request-id")).toBe("req-1");
    expect(service.ask).toHaveBeenCalledWith({ question: "What is the fee?" });
  });

  it("returns a body that matches the shared contract", async () => {
    const response = await route(fakeService())(post({ question: "What is the fee?" }));
    expect(chatAnswerDtoSchema.safeParse(await response.json()).success).toBe(true);
  });

  it("passes the fallback reply through as not_available", async () => {
    const service = fakeService({
      text: "I could not find this in the club documents.",
      citations: [],
      outcome: "not_available",
    });
    const body = await (await route(service)(post({ question: "Who won in 1998?" }))).json();
    expect(body).toMatchObject({ outcome: "not_available", citations: [] });
  });

  it("never sends fields the contract does not name", async () => {
    const leaky = { ...answered, prompt: "system prompt", timings: { generate: 900 } };
    const body = await (await route(fakeService(leaky))(post({ question: "Hi" }))).json();
    expect(Object.keys(body).sort()).toEqual(["citations", "outcome", "requestId", "text"]);
  });

  it.each([
    ["an empty question", { question: "" }],
    ["a question of only spaces", { question: "   " }],
    ["no question", {}],
    ["a conversation id that is not a uuid", { question: "Hi", conversationId: "1 OR 1=1" }],
  ])("refuses %s with 400 and never calls the service", async (_name, body) => {
    const service = fakeService();
    const response = await route(service)(post(body));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_request" });
    expect(service.ask).not.toHaveBeenCalled();
  });

  it("refuses a body that is not JSON with 400, not 500", async () => {
    const response = await route(fakeService())(post("{not json"));
    expect(response.status).toBe(400);
  });

  it("drops unknown fields before the service sees them", async () => {
    const service = fakeService();
    await route(service)(post({ question: "Hi", role: "admin", userId: "someone-else" }));
    expect(service.ask).toHaveBeenCalledWith({ question: "Hi" });
  });

  it("returns 503, not the fallback reply, when the AI provider fails", async () => {
    const service = { ask: vi.fn().mockRejectedValue(new ProviderError("timeout", "slow")) };
    const response = await route(service)(post({ question: "Hi" }, { "x-request-id": "req-2" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "ai_unavailable", requestId: "req-2" });
  });

  it("returns 500 without details for any other error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const service = { ask: vi.fn().mockRejectedValue(new Error("database password is x")) };
    const response = await route(service)(post({ question: "Hi" }, { "x-request-id": "req-3" }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "internal_error", requestId: "req-3" });
  });
});

// Permission test. The final rule is "signed-in, consented members" (PBI-016, PBI-017, PBI-018).
// Until then the route is open where the flag is on, and closed everywhere else.
describe("POST /api/chat permissions (temporary, until PBI-017 and PBI-018)", () => {
  it("answers 404 and never runs the pipeline when CHAT_API_ENABLED is off", async () => {
    const service = fakeService();
    const response = await route(
      service,
      false,
    )(post({ question: "What is the fee?" }, { "x-request-id": "req-4" }));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found", requestId: "req-4" });
    expect(service.ask).not.toHaveBeenCalled();
  });

  it("is open to a caller with no session while the flag is on (to be closed by PBI-017)", async () => {
    const response = await route(fakeService(), true)(post({ question: "What is the fee?" }));
    expect(response.status).toBe(200);
  });
});

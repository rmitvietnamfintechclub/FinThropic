import { describe, expect, it, vi } from "vitest";
import type { RagContext } from "../rag/types";
import { DefaultChatService, type PipelineRunner } from "./chat.service";

const CHUNK_ID = "0b7c1a52-9a3e-4f43-8d0e-6f1d2c3b4a51";

function context(fields: Partial<RagContext>): RagContext {
  return { question: "q", history: [], chunks: [], citations: [], timings: {}, ...fields };
}

function serviceReturning(ctx: RagContext) {
  const run = vi.fn<PipelineRunner>().mockResolvedValue(ctx);
  return { run, service: new DefaultChatService(run) };
}

describe("DefaultChatService", () => {
  it("runs the pipeline with the question and an empty history", async () => {
    const { run, service } = serviceReturning(
      context({ answer: "No answer.", outcome: "not_available" }),
    );
    await service.ask({ question: "What is the fee?" });
    expect(run).toHaveBeenCalledWith({ question: "What is the fee?", history: [] });
  });

  it("returns the answer, its citations and the outcome", async () => {
    const citations = [{ number: 1, chunkId: CHUNK_ID, documentName: "Club handbook", page: 3 }];
    const { service } = serviceReturning(
      context({ answer: "Paid each semester [1].", citations, outcome: "answered" }),
    );
    expect(await service.ask({ question: "What is the fee?" })).toEqual({
      text: "Paid each semester [1].",
      citations,
      outcome: "answered",
    });
  });

  it("returns the fallback reply with no citations when nothing relevant was found", async () => {
    const { service } = serviceReturning(
      context({
        answer: "I could not find this in the club documents.",
        outcome: "not_available",
        citations: [{ number: 1, chunkId: CHUNK_ID, documentName: "Club handbook", page: 3 }],
      }),
    );
    const result = await service.ask({ question: "Who won in 1998?" });
    expect(result.outcome).toBe("not_available");
    expect(result.citations).toEqual([]);
  });

  it("fails loudly if the pipeline ends without an answer", async () => {
    const { service } = serviceReturning(context({}));
    await expect(service.ask({ question: "Hi" })).rejects.toThrow("without an answer");
  });
});

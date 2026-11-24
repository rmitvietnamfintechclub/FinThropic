import { describe, expect, it } from "vitest";
import type { EmbedTask, Embedder } from "@/server/ai/ports";
import type { RagContext } from "../types";
import { createEmbedQuestionStep } from "./embedQuestion.step";

function context(overrides: Partial<RagContext> = {}): RagContext {
  return {
    question: "When is Club Day?",
    history: [],
    chunks: [],
    citations: [],
    timings: {},
    ...overrides,
  };
}

function recordingEmbedder(vectors: number[][]) {
  const calls: { texts: string[]; task: EmbedTask }[] = [];
  const embedder: Embedder = {
    async embed(texts, task) {
      calls.push({ texts, task });
      return vectors;
    },
  };
  return { embedder, calls };
}

describe("embedQuestion step", () => {
  it("embeds the question with task query and stores the vector", async () => {
    const { embedder, calls } = recordingEmbedder([[0.6, 0.8]]);
    const ctx = await createEmbedQuestionStep(embedder).run(context());
    expect(calls).toEqual([{ texts: ["When is Club Day?"], task: "query" }]);
    expect(ctx.questionEmbedding).toEqual([0.6, 0.8]);
  });

  it("embeds the rewritten question when there is one", async () => {
    const { embedder, calls } = recordingEmbedder([[1, 0]]);
    await createEmbedQuestionStep(embedder).run(
      context({ rewritten: "When is Club Day in 2026?" }),
    );
    expect(calls[0]?.texts).toEqual(["When is Club Day in 2026?"]);
  });

  it("fails loudly when the embedder returns no vector", async () => {
    const { embedder } = recordingEmbedder([]);
    await expect(createEmbedQuestionStep(embedder).run(context())).rejects.toThrow("no vector");
  });
});

import { describe, expect, it } from "vitest";
import type { LanguageModel } from "@/server/ai/ports";
import { FALLBACK_REPLY, RELEVANCE_THRESHOLD } from "../../constants/chat.constants";
import { runPipeline } from "../pipeline";
import type { RagContext, RagStep } from "../types";
import { thresholdStep } from "./threshold.step";

function contextWith(scores: number[]): RagContext {
  return {
    question: "q",
    history: [],
    chunks: scores.map((score, i) => ({
      chunkId: `c${i}`,
      documentName: "d.pdf",
      text: "t",
      page: 1,
      score,
    })),
    citations: [],
    timings: {},
  };
}

describe("threshold step", () => {
  it("returns the fallback reply when no chunk was retrieved", async () => {
    const ctx = await thresholdStep.run(contextWith([]));
    expect(ctx.outcome).toBe("not_available");
    expect(ctx.answer).toBe(FALLBACK_REPLY);
  });

  it("returns the fallback reply when the top similarity is below the threshold", async () => {
    const ctx = await thresholdStep.run(contextWith([RELEVANCE_THRESHOLD - 0.01, 0.1]));
    expect(ctx.outcome).toBe("not_available");
    expect(ctx.answer).toBe(FALLBACK_REPLY);
  });

  it("gates on the best chunk, not the first one", async () => {
    const ctx = await thresholdStep.run(contextWith([0.1, RELEVANCE_THRESHOLD]));
    expect(ctx.outcome).toBeUndefined();
    expect(ctx.answer).toBeUndefined();
  });
});

describe("TC2: an off-topic question", () => {
  it("returns the fallback reply and the model records zero calls", async () => {
    const calls: string[] = [];
    const recordingModel: LanguageModel = {
      async generate({ prompt }) {
        calls.push(prompt);
        return { text: "should never be used", tokens: 1 };
      },
    };
    // Stand-in for vector search over the test PDF: the nearest chunk is far from the question.
    const searchStub: RagStep = {
      name: "search",
      async run(ctx) {
        const chunk = {
          chunkId: "budget-1",
          documentName: "Finance handbook.pdf",
          text: "Budget requests go to the treasurer.",
          page: 3,
        };
        return { ...ctx, chunks: [{ ...chunk, score: 0.12 }] };
      },
    };
    const generateStub: RagStep = {
      name: "generate",
      async run(ctx) {
        const { text } = await recordingModel.generate({ system: "", prompt: ctx.question });
        return { ...ctx, answer: text, outcome: "answered" };
      },
    };

    const ctx = await runPipeline({ question: "Who won the 2018 World Cup?", history: [] }, [
      searchStub,
      thresholdStep,
      generateStub,
    ]);

    expect(ctx.answer).toBe(FALLBACK_REPLY);
    expect(ctx.outcome).toBe("not_available");
    expect(calls).toHaveLength(0);
    expect(Object.keys(ctx.timings)).toEqual(["search", "threshold"]);
  });
});

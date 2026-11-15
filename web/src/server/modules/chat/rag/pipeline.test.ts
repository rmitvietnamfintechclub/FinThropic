import { describe, expect, it } from "vitest";
import { defaultSteps, runPipeline } from "./pipeline";

describe("answering pipeline", () => {
  it("has the steps of Appendix G in order", () => {
    expect(defaultSteps.map((s) => s.name)).toEqual([
      "session",
      "rewriteFollowUp",
      "embedQuestion",
      "search",
      "mergeRrf",
      "rerank",
      "threshold",
      "generate",
      "checkCitations",
      "stream",
    ]);
  });

  it("runs every step and records its duration", async () => {
    const ctx = await runPipeline({ question: "How do I request budget?", history: [] });
    expect(Object.keys(ctx.timings)).toHaveLength(defaultSteps.length);
  });
});

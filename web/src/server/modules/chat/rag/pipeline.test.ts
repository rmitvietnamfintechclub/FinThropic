import { describe, expect, it } from "vitest";
import { defaultSteps, runPipeline } from "./pipeline";
import type { RagStep } from "./types";

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
    const steps: RagStep[] = ["a", "b", "c"].map((name) => ({ name, run: async (ctx) => ctx }));
    const ctx = await runPipeline({ question: "How do I request budget?", history: [] }, steps);
    expect(Object.keys(ctx.timings)).toEqual(["a", "b", "c"]);
  });

  it("stops after a step sets the outcome to not available", async () => {
    // The search placeholder finds no chunk, so the threshold step ends the run.
    const ctx = await runPipeline({ question: "How do I request budget?", history: [] });
    expect(ctx.outcome).toBe("not_available");
    const ran = defaultSteps.slice(0, defaultSteps.findIndex((s) => s.name === "threshold") + 1);
    expect(Object.keys(ctx.timings)).toEqual(ran.map((s) => s.name));
  });
});

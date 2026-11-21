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
    const ran: string[] = [];
    const record = (name: string): RagStep => ({
      name,
      run: async (ctx) => {
        ran.push(name);
        return ctx;
      },
    });
    const refuse: RagStep = {
      name: "refuse",
      run: async (ctx) => ({ ...ctx, outcome: "not_available" }),
    };
    const ctx = await runPipeline({ question: "q", history: [] }, [
      record("before"),
      refuse,
      record("after"),
    ]);
    expect(ctx.outcome).toBe("not_available");
    expect(ran).toEqual(["before"]);
    expect(Object.keys(ctx.timings)).toEqual(["before", "refuse"]);
  });
});

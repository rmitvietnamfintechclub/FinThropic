import { describe, expect, it } from "vitest";
import type { LanguageModel } from "@/server/ai/ports";
import { defaultSteps, runPipeline } from "./pipeline";
import { createGenerateStep } from "./steps/generate.step";
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

  it("AC3: rejects with ProviderError timeout when generate times out, with no fallback answer", async () => {
    const timingOut: LanguageModel = {
      async generate() {
        throw new DOMException("The operation timed out.", "TimeoutError");
      },
    };
    const retrieve: RagStep = {
      name: "retrieve",
      run: async (ctx) => ({
        ...ctx,
        chunks: [{ chunkId: "c1", documentName: "Handbook.pdf", text: "t", page: 1, score: 0.9 }],
      }),
    };
    const ran: string[] = [];
    const after: RagStep = {
      name: "after",
      run: async (ctx) => {
        ran.push("after");
        return ctx;
      },
    };

    await expect(
      runPipeline({ question: "q", history: [] }, [retrieve, createGenerateStep(timingOut), after]),
    ).rejects.toMatchObject({ name: "ProviderError", kind: "timeout" });
    expect(ran).toEqual([]);
  });
});

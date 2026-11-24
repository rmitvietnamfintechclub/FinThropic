import "server-only";
import { gatewayLanguageModel } from "@/server/ai/adapters/gateway";
import { checkCitationsStep } from "./steps/checkCitations.step";
import { embedQuestionStep } from "./steps/embedQuestion.step";
import { createGenerateStep } from "./steps/generate.step";
import { mergeRrfStep } from "./steps/mergeRrf.step";
import { rerankStep } from "./steps/rerank.step";
import { rewriteFollowUpStep } from "./steps/rewriteFollowUp.step";
import { searchStep } from "./steps/search.step";
import { sessionStep } from "./steps/session.step";
import { streamStep } from "./steps/stream.step";
import { thresholdStep } from "./steps/threshold.step";
import type { RagContext, RagStep } from "./types";

// Pipes and filters: the runner chains the steps in order and times each one.
// A step that sets outcome "not_available" ends the run: the steps after it never run, so no model call.
export const defaultSteps: RagStep[] = [
  sessionStep,
  rewriteFollowUpStep,
  embedQuestionStep,
  searchStep,
  mergeRrfStep,
  rerankStep,
  thresholdStep,
  createGenerateStep(gatewayLanguageModel),
  checkCitationsStep,
  streamStep,
];

export async function runPipeline(
  input: Pick<RagContext, "question" | "history">,
  steps: RagStep[] = defaultSteps,
): Promise<RagContext> {
  let ctx: RagContext = { ...input, chunks: [], citations: [], timings: {} };
  for (const step of steps) {
    const started = performance.now();
    ctx = await step.run(ctx);
    ctx.timings[step.name] = Math.round(performance.now() - started);
    if (ctx.outcome === "not_available") break;
  }
  return ctx;
}

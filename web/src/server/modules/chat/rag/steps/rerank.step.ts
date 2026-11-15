import "server-only";
import type { RagContext, RagStep } from "../types";

/**
 * Optional: re-score the merged list with a reranker; kept only if the evaluation shows a clear gain.
 *
 * Owner: AI/RAG 1. PBI-032 (Should). Optional step.
 * Placeholder: passes the context through so the pipeline runs end to end. Replace it in the PBI above.
 */
export const rerankStep: RagStep = {
  name: "rerank",
  async run(ctx: RagContext): Promise<RagContext> {
    return ctx;
  },
};

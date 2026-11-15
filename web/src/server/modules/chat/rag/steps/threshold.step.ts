import "server-only";
import type { RagContext, RagStep } from "../types";

/**
 * Relevance check on the top vector similarity or the reranker score, never the RRF score. Nothing relevant means the fallback reply and no model call.
 *
 * Owner: AI/RAG 1. PBI-004, PBI-020.
 * Placeholder: passes the context through so the pipeline runs end to end. Replace it in the PBI above.
 */
export const thresholdStep: RagStep = {
  name: "threshold",
  async run(ctx: RagContext): Promise<RagContext> {
    return ctx;
  },
};

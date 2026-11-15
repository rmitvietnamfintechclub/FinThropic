import "server-only";
import type { RagContext, RagStep } from "../types";

/**
 * Merge the two result lists by rank (Reciprocal Rank Fusion).
 *
 * Owner: AI/RAG 1. PBI-009.
 * Placeholder: passes the context through so the pipeline runs end to end. Replace it in the PBI above.
 */
export const mergeRrfStep: RagStep = {
  name: "mergeRrf",
  async run(ctx: RagContext): Promise<RagContext> {
    return ctx;
  },
};

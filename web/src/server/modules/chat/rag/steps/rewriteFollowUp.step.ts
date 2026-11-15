import "server-only";
import type { RagContext, RagStep } from "../types";

/**
 * Rewrite a follow-up question into a standalone one using the earlier messages; fall back to the original if the rewrite fails.
 *
 * Owner: AI/RAG 1. PBI-030 (Must).
 * Placeholder: passes the context through so the pipeline runs end to end. Replace it in the PBI above.
 */
export const rewriteFollowUpStep: RagStep = {
  name: "rewriteFollowUp",
  async run(ctx: RagContext): Promise<RagContext> {
    return ctx;
  },
};

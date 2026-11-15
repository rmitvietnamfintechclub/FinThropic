import "server-only";
import type { RagContext, RagStep } from "../types";

/**
 * Check who is asking and what they may read.
 *
 * Owner: AI/RAG 1. PBI-004, PBI-017.
 * Placeholder: passes the context through so the pipeline runs end to end. Replace it in the PBI above.
 */
export const sessionStep: RagStep = {
  name: "session",
  async run(ctx: RagContext): Promise<RagContext> {
    return ctx;
  },
};

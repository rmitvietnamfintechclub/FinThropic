import "server-only";
import type { RagContext, RagStep } from "../types";

/**
 * Send the answer word by word.
 *
 * Owner: Frontend 1 with AI/RAG 1. PBI-028 (Should). Optional step.
 * Placeholder: passes the context through so the pipeline runs end to end. Replace it in the PBI above.
 */
export const streamStep: RagStep = {
  name: "stream",
  async run(ctx: RagContext): Promise<RagContext> {
    return ctx;
  },
};

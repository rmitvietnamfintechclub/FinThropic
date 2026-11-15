import "server-only";
import type { RagContext, RagStep } from "../types";

/**
 * Ask the model to answer only from the retrieved chunks, with numbered citations.
 *
 * Owner: AI/RAG 1. PBI-004.
 * Placeholder: passes the context through so the pipeline runs end to end. Replace it in the PBI above.
 */
export const generateStep: RagStep = {
  name: "generate",
  async run(ctx: RagContext): Promise<RagContext> {
    return ctx;
  },
};

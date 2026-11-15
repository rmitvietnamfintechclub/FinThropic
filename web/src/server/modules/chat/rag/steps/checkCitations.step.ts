import "server-only";
import type { RagContext, RagStep } from "../types";

/**
 * Every citation number must point to a retrieved chunk; a fact paragraph without one is marked "no source".
 *
 * Owner: AI/RAG 1. PBI-010.
 * Placeholder: passes the context through so the pipeline runs end to end. Replace it in the PBI above.
 */
export const checkCitationsStep: RagStep = {
  name: "checkCitations",
  async run(ctx: RagContext): Promise<RagContext> {
    return ctx;
  },
};

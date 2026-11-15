import "server-only";
import type { RagContext, RagStep } from "../types";

/**
 * Embed the question with task type "query".
 *
 * Owner: AI/RAG 1. PBI-004.
 * Placeholder: passes the context through so the pipeline runs end to end. Replace it in the PBI above.
 */
export const embedQuestionStep: RagStep = {
  name: "embedQuestion",
  async run(ctx: RagContext): Promise<RagContext> {
    return ctx;
  },
};

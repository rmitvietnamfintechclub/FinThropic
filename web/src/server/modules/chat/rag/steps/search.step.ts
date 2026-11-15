import "server-only";
import type { RagContext, RagStep } from "../types";

/**
 * Vector search and keyword search, both with the access filter inside the SQL.
 *
 * Owner: AI/RAG 1. PBI-009.
 * Placeholder: passes the context through so the pipeline runs end to end. Replace it in the PBI above.
 */
export const searchStep: RagStep = {
  name: "search",
  async run(ctx: RagContext): Promise<RagContext> {
    return ctx;
  },
};

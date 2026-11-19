import "server-only";
import { FALLBACK_REPLY, RELEVANCE_THRESHOLD } from "../../constants/chat.constants";
import type { RagContext, RagStep } from "../types";

/**
 * Relevance check on the top vector similarity, never the RRF score (a rank, not a relevance).
 * Nothing relevant means the fallback reply, and the runner stops so no later step calls the model.
 *
 * Owner: AI/RAG 1. PBI-004, PBI-020.
 */
export const thresholdStep: RagStep = {
  name: "threshold",
  async run(ctx: RagContext): Promise<RagContext> {
    if (ctx.chunks.some((chunk) => chunk.score >= RELEVANCE_THRESHOLD)) return ctx;
    return { ...ctx, outcome: "not_available", answer: FALLBACK_REPLY };
  },
};

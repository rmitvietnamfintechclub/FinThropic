import "server-only";
import type { Embedder } from "@/server/ai/ports";
import type { RagContext, RagStep } from "../types";

/**
 * Embed the question with task type "query", the same model that embedded the chunks.
 * A provider failure or timeout surfaces as ProviderError (a service error), never as the fallback reply.
 *
 * Owner: AI/RAG 1. PBI-004.
 */
export function createEmbedQuestionStep(embedder: Embedder): RagStep {
  return {
    name: "embedQuestion",
    async run(ctx: RagContext): Promise<RagContext> {
      const [vector] = await embedder.embed([ctx.rewritten ?? ctx.question], "query");
      if (vector === undefined) {
        throw new Error("the embedder returned no vector for the question");
      }
      return { ...ctx, questionEmbedding: vector };
    },
  };
}

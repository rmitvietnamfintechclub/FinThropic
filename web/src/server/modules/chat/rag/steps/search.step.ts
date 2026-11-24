import "server-only";
import type { SearchRepository } from "@/server/modules/documents";
import { VECTOR_SEARCH_LIMIT } from "../../constants/chat.constants";
import type { RagContext, RagStep } from "../types";

/**
 * Vector search and keyword search, both with the access filter inside the SQL.
 *
 * Owner: AI/RAG 1. PBI-009.
 * Vector search runs now (#66, wired in #69). Keyword search, the second ranked list and the
 * access-filter test come with PBI-009.3 (#85); the RRF merge with PBI-009.2 (#84).
 * `getRepository` is called once per question, so the database client is built per request.
 */
export function createSearchStep(getRepository: () => SearchRepository): RagStep {
  return {
    name: "search",
    async run(ctx: RagContext): Promise<RagContext> {
      if (ctx.questionEmbedding === undefined) {
        throw new Error("search needs the question embedding: run embedQuestion first");
      }
      const matches = await getRepository().searchVector(
        ctx.questionEmbedding,
        VECTOR_SEARCH_LIMIT,
      );
      return {
        ...ctx,
        chunks: matches.map(({ chunkId, documentName, text, page, score }) => ({
          chunkId,
          documentName,
          text,
          page,
          score,
        })),
      };
    },
  };
}

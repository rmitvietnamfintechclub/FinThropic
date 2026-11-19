import "server-only";
import type { Embedder } from "@/server/ai/ports";
import { RECALL_AT, TOP_K_SAVED } from "./constants";
import { isOnPage, type ChunkRow, type QuestionRow } from "./inputs";
import {
  bestCutoff,
  cosine,
  rankingMetrics,
  spread,
  type Cutoff,
  type QuestionOutcome,
  type RankingMetrics,
  type Spread,
} from "./metrics";

export interface RankedChunk {
  chunkId: string;
  documentName: string;
  page: number;
  similarity: number;
}

export interface QuestionResult extends QuestionOutcome {
  id: string;
  gold: QuestionRow["gold"];
  top: RankedChunk[];
}

export interface RetrievalReport {
  chunkCount: number;
  questionCount: number;
  ranking: RankingMetrics;
  top1: { answerable: Spread | null; noAnswer: Spread | null; bestCutoff: Cutoff | null };
  questions: QuestionResult[];
}

/**
 * Embeds chunks as documents and questions as queries through the Embedder port, ranks every chunk
 * by cosine similarity in memory, and scores the ranking. A hit is a chunk on the gold page.
 */
export async function evaluateRetrieval(
  chunks: ChunkRow[],
  questions: QuestionRow[],
  embedder: Embedder,
): Promise<RetrievalReport> {
  const chunkVectors = await embedder.embed(
    chunks.map((chunk) => chunk.text),
    "document",
  );
  const questionVectors = await embedder.embed(
    questions.map((question) => question.question),
    "query",
  );

  const results = questions.map((question, q): QuestionResult => {
    const ranked = chunks
      .map((chunk, c) => ({
        chunkId: chunk.chunkId,
        documentName: chunk.documentName,
        page: chunk.page,
        similarity: cosine(questionVectors[q], chunkVectors[c]),
      }))
      // Stable sort: equal scores keep file order, so a run is repeatable.
      .sort((a, b) => b.similarity - a.similarity);
    const gold = question.gold;
    const hitIndex = gold ? ranked.findIndex((r) => isOnPage(r, gold)) : -1;
    return {
      id: question.id,
      gold,
      answerable: gold !== null,
      firstHitRank: hitIndex === -1 ? null : hitIndex + 1,
      top1Similarity: ranked[0].similarity,
      top: ranked.slice(0, TOP_K_SAVED),
    };
  });

  const top1Of = (answerable: boolean) =>
    results.filter((r) => r.answerable === answerable).map((r) => r.top1Similarity);

  return {
    chunkCount: chunks.length,
    questionCount: questions.length,
    ranking: rankingMetrics(results, RECALL_AT),
    top1: {
      answerable: spread(top1Of(true)),
      noAnswer: spread(top1Of(false)),
      bestCutoff: bestCutoff(top1Of(true), top1Of(false)),
    },
    questions: results,
  };
}

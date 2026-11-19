import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { fakeWordEmbedder } from "@/server/ai/adapters/fake";
import type { Embedder, EmbedTask } from "@/server/ai/ports";
import { evaluateRetrieval } from "./evaluate";
import {
  checkInputs,
  chunkRowSchema,
  parseJsonl,
  questionRowSchema,
  type ChunkRow,
  type QuestionRow,
} from "./inputs";

/** An embedder that returns hand-picked vectors, and records which task each call used. */
function tableEmbedder(vectors: Record<string, number[]>) {
  const calls: { task: EmbedTask; count: number }[] = [];
  const embedder: Embedder = {
    async embed(texts, task) {
      calls.push({ task, count: texts.length });
      return texts.map((text) => vectors[text]);
    },
  };
  return { embedder, calls };
}

const chunks: ChunkRow[] = [
  { chunkId: "c1", documentName: "a.pdf", page: 1, text: "fee" },
  { chunkId: "c2", documentName: "a.pdf", page: 2, text: "vote" },
  { chunkId: "c3", documentName: "b.pdf", page: 1, text: "event" },
];

const questions: QuestionRow[] = [
  { id: "hit-1", question: "q-fee", gold: { documentName: "a.pdf", page: 1 } },
  { id: "hit-2", question: "q-vote", gold: { documentName: "a.pdf", page: 2 } },
  { id: "none", question: "q-cup", gold: null },
];

const vectors: Record<string, number[]> = {
  fee: [1, 0, 0],
  vote: [0, 1, 0],
  event: [0, 0, 1],
  "q-fee": [0.9, 0.1, 0], // c1 first
  "q-vote": [0, 0.6, 0.8], // c3 first, then c2: gold at rank 2
  "q-cup": [0.3, 0.3, 0.3],
};

describe("evaluateRetrieval", () => {
  it("embeds chunks as documents and questions as queries", async () => {
    const { embedder, calls } = tableEmbedder(vectors);
    await evaluateRetrieval(chunks, questions, embedder);
    expect(calls).toEqual([
      { task: "document", count: 3 },
      { task: "query", count: 3 },
    ]);
  });

  it("ranks chunks by cosine and scores the first chunk on the gold page", async () => {
    const report = await evaluateRetrieval(chunks, questions, tableEmbedder(vectors).embedder);
    const [fee, vote, none] = report.questions;
    expect(fee.firstHitRank).toBe(1);
    expect(fee.top.map((r) => r.chunkId)).toEqual(["c1", "c2", "c3"]);
    expect(vote.firstHitRank).toBe(2);
    expect(vote.top1Similarity).toBeCloseTo(0.8);
    expect(none).toMatchObject({ answerable: false, firstHitRank: null });
    expect(none.top1Similarity).toBeCloseTo(1 / Math.sqrt(3));

    expect(report.ranking).toEqual({
      answerableCount: 2,
      recallAt: { "@1": 0.5, "@5": 1 },
      mrr: 0.75,
    });
    expect(report.top1.answerable?.count).toBe(2);
    expect(report.top1.noAnswer?.count).toBe(1);
    // Answerable top-1 scores are about 0.99 and 0.8, the no-answer one about 0.58.
    expect(report.top1.bestCutoff?.misclassified).toBe(0);
  });

  it("scores the committed example with the fake word embedder", async () => {
    const dir = resolve(import.meta.dirname, "example");
    const exampleChunks = parseJsonl(
      readFileSync(resolve(dir, "chunks.jsonl"), "utf8"),
      chunkRowSchema,
      "chunks.jsonl",
    );
    const exampleQuestions = parseJsonl(
      readFileSync(resolve(dir, "questions.jsonl"), "utf8"),
      questionRowSchema,
      "questions.jsonl",
    );
    checkInputs(exampleChunks, exampleQuestions);
    const report = await evaluateRetrieval(exampleChunks, exampleQuestions, fakeWordEmbedder);
    expect(report.ranking.answerableCount).toBe(5);
    expect(report.ranking.recallAt["@5"]).toBe(1);
    expect(report.top1.noAnswer?.count).toBe(2);
  });
});

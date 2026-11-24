import { describe, expect, it } from "vitest";
import type { ChunkMatch, SearchRepository } from "@/server/modules/documents";
import { VECTOR_SEARCH_LIMIT } from "../../constants/chat.constants";
import type { RagContext } from "../types";
import { createSearchStep } from "./search.step";

function context(overrides: Partial<RagContext> = {}): RagContext {
  return { question: "q", history: [], chunks: [], citations: [], timings: {}, ...overrides };
}

const match: ChunkMatch = {
  chunkId: "c1",
  documentId: "d1",
  documentName: "Club handbook 2026.pdf",
  text: "Members meet every second Thursday.",
  page: 3,
  score: 0.82,
};

function fakeRepository(matches: ChunkMatch[]) {
  const calls: { embedding: number[]; limit: number }[] = [];
  const repository: SearchRepository = {
    async searchVector(embedding, limit) {
      calls.push({ embedding, limit });
      return matches;
    },
  };
  return { repository, calls };
}

describe("search step", () => {
  it("searches with the question vector and keeps name, text, page and similarity", async () => {
    const { repository, calls } = fakeRepository([match]);
    const ctx = await createSearchStep(() => repository).run(
      context({ questionEmbedding: [0.6, 0.8] }),
    );
    expect(calls).toEqual([{ embedding: [0.6, 0.8], limit: VECTOR_SEARCH_LIMIT }]);
    expect(ctx.chunks).toEqual([
      {
        chunkId: "c1",
        documentName: "Club handbook 2026.pdf",
        text: "Members meet every second Thursday.",
        page: 3,
        score: 0.82,
      },
    ]);
  });

  it("returns no chunks when nothing matches, so the threshold step gives the fallback", async () => {
    const { repository } = fakeRepository([]);
    const ctx = await createSearchStep(() => repository).run(
      context({ questionEmbedding: [1, 0] }),
    );
    expect(ctx.chunks).toEqual([]);
  });

  it("builds the repository once per question", async () => {
    let built = 0;
    const { repository } = fakeRepository([]);
    const step = createSearchStep(() => {
      built += 1;
      return repository;
    });
    await step.run(context({ questionEmbedding: [1, 0] }));
    await step.run(context({ questionEmbedding: [1, 0] }));
    expect(built).toBe(2);
  });

  it("fails loudly when the question was not embedded", async () => {
    const { repository } = fakeRepository([match]);
    await expect(createSearchStep(() => repository).run(context())).rejects.toThrow(
      "run embedQuestion first",
    );
  });
});

import "server-only";
import type { Embedder, LanguageModel, Reranker } from "../ports";

// Deterministic adapters for tests: no network, no cost.
export const fakeEmbedder: Embedder = {
  async embed(texts) {
    return texts.map((text) => [text.length % 7, 1, 0]);
  },
};

export const fakeLanguageModel: LanguageModel = {
  async generate({ prompt }) {
    return { text: `fake answer to: ${prompt.slice(0, 40)}`, tokens: 10 };
  },
};

export const fakeReranker: Reranker = {
  async rerank(_query, passages) {
    return passages.map((_, index) => ({ index, score: 1 - index / passages.length }));
  },
};

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

const WORD_HASH_DIMENSIONS = 256;

/**
 * A deterministic bag-of-words embedder: each word is hashed into one of 256 slots and the vector
 * is normalized. Texts that share words score higher, so retrieval tests and the eval's
 * `--embedder fake` run give meaningful rankings with no network and no cost.
 */
export const fakeWordEmbedder: Embedder = {
  async embed(texts) {
    return texts.map((text) => {
      const vector = new Array<number>(WORD_HASH_DIMENSIONS).fill(0);
      for (const word of text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) {
        let hash = 2166136261;
        for (const char of word) hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), 16777619);
        vector[(hash >>> 0) % WORD_HASH_DIMENSIONS] += 1;
      }
      const norm = Math.hypot(...vector);
      return norm === 0 ? vector : vector.map((value) => value / norm);
    });
  },
};

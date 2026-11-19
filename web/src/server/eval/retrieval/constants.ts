import "server-only";

/** Recall is reported at these cut-offs (issue #61 asks "is the right page in the top 5"). */
export const RECALL_AT = [1, 5] as const;

/** How many ranked chunks each question keeps in the results file. */
export const TOP_K_SAVED = 5;

/** Texts sent to the Embedder in one call. Gemini's batch embed accepts up to 100. */
export const EMBED_BATCH_SIZE = 100;

/**
 * The model behind each embedder, used in the cache key. Change the label when the model or its
 * settings change, so old vectors are not reused. Keep the Gemini label equal to the model and
 * dimensions the adapter in src/server/ai/adapters/gemini.ts uses (PBI-004).
 */
export const EMBEDDER_MODELS = {
  fake: "fake-word-hash-v1",
  gemini: "gemini-embedding-001@1536",
} as const;

export type EmbedderName = keyof typeof EMBEDDER_MODELS;

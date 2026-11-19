import "server-only";

/** Recall is reported at these cut-offs (issue #61 asks "is the right page in the top 5"). */
export const RECALL_AT = [1, 5] as const;

/** How many ranked chunks each question keeps in the results file. */
export const TOP_K_SAVED = 5;

/** Texts sent to the Embedder in one call. Gemini's batch embed accepts up to 100. */
export const EMBED_BATCH_SIZE = 100;

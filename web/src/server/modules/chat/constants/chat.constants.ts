import "server-only";

export const FALLBACK_REPLY = "I could not find this in the club documents.";

/**
 * Lowest top vector similarity (cosine, 0 to 1) that still counts as relevant. Below it the pipeline
 * returns FALLBACK_REPLY and never calls the model.
 * Provisional guess: no evaluation has measured it yet. Tune it in PBI-020 and PBI-027 with the
 * retrieval smoke eval.
 */
export const RELEVANCE_THRESHOLD = 0.5;

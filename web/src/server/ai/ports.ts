import "server-only";
// Ports: the AI part never calls Gemini (or any provider) directly. It calls these interfaces.
// Swapping the provider means writing one adapter, not editing the pipeline (Appendix G4).

export type EmbedTask = "document" | "query";

export interface Embedder {
  /** Returns one normalized vector per text. Same model for documents and questions. */
  embed(texts: string[], task: EmbedTask): Promise<number[][]>;
}

export interface LanguageModel {
  generate(input: { system: string; prompt: string }): Promise<{ text: string; tokens: number }>;
}

export interface Reranker {
  /** Returns the indexes of `passages`, best first, with a score for each. */
  rerank(query: string, passages: string[]): Promise<{ index: number; score: number }[]>;
}

import "server-only";

/** What flows through the answering pipeline. Each step reads it and returns it with fields added. */
export interface RagContext {
  question: string;
  history: { role: "user" | "assistant"; text: string }[];
  rewritten?: string;
  /**
   * `score` is the cosine similarity of the chunk to the question, higher is closer:
   * `1 - (embedding <=> query)` in pgvector; never the raw distance and never the RRF score.
   * `documentName` is the name shown in a citation; vector search (#66) fills it.
   */
  chunks: { chunkId: string; documentName: string; text: string; page: number; score: number }[];
  answer?: string;
  /** `number` is the `[n]` marker in the answer; the passage it names is `chunks[number - 1]`. */
  citations: { number: number; chunkId: string; documentName: string; page: number }[];
  outcome?: "answered" | "not_available";
  timings: Record<string, number>;
}

export interface RagStep {
  name: string;
  run(ctx: RagContext): Promise<RagContext>;
}

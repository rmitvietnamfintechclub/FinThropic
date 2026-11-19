import "server-only";

/** What flows through the answering pipeline. Each step reads it and returns it with fields added. */
export interface RagContext {
  question: string;
  history: { role: "user" | "assistant"; text: string }[];
  rewritten?: string;
  /** `score` is the vector similarity of the chunk to the question, never the RRF score. */
  chunks: { chunkId: string; text: string; page: number; score: number }[];
  answer?: string;
  citations: { chunkId: string; documentName: string; page: number }[];
  outcome?: "answered" | "not_available";
  timings: Record<string, number>;
}

export interface RagStep {
  name: string;
  run(ctx: RagContext): Promise<RagContext>;
}

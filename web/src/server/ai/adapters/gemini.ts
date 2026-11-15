import "server-only";
import type { Embedder, LanguageModel } from "../ports";

// The only file that may import the Gemini SDK. Owner: AI/RAG 1 (PBI-004).
// Embedding rules: task type document for chunks and query for questions, same model on both sides,
// 1,536 dimensions, normalized, and the model name and pipeline version stored with each chunk.
export const geminiEmbedder: Embedder = {
  async embed() {
    throw new Error("Gemini embedder not implemented yet (PBI-004)");
  },
};

export const geminiLanguageModel: LanguageModel = {
  async generate() {
    throw new Error("Gemini language model not implemented yet (PBI-004)");
  },
};

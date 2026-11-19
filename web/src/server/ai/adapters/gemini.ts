import "server-only";
import { GoogleGenAI } from "@google/genai";
import { getEnv } from "@/server/config/env";
import { logger } from "@/server/utils/logger";
import {
  EMBEDDING_DIMENSIONS,
  GEMINI_ATTEMPTS,
  GEMINI_EMBEDDING_MODEL,
  GEMINI_GENERATION_MODEL,
  GEMINI_TIMEOUT_MS,
} from "../constants/gemini.constants";
import { ProviderError } from "../errors";
import type { EmbedTask, Embedder, LanguageModel } from "../ports";

// The only file that may import the Gemini SDK. Owner: AI/RAG 1 (PBI-004).
// Embedding rules: task type document for chunks and query for questions, same model on both sides,
// 1,536 dimensions, normalized, and the model name and pipeline version stored with each chunk.
// Never log the prompt, the question, document text or the key: logs carry the operation, attempt and status only.

const TASK_TYPES: Record<EmbedTask, string> = {
  query: "RETRIEVAL_QUERY",
  document: "RETRIEVAL_DOCUMENT",
};

let client: GoogleGenAI | undefined;
function gemini(): GoogleGenAI {
  // No SDK retryOptions: the SDK then makes one attempt, and withRetry below owns timeouts and retries.
  client ??= new GoogleGenAI({ apiKey: getEnv().GEMINI_API_KEY });
  return client;
}

const TIMED_OUT = Symbol("timed out");

/** Runs `call` with a timeout per attempt and one retry. Throws ProviderError when every attempt fails. */
async function withRetry<T>(operation: string, call: (signal: AbortSignal) => Promise<T>) {
  let kind: ProviderError["kind"] = "failure";
  for (let attempt = 1; attempt <= GEMINI_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(TIMED_OUT);
      }, GEMINI_TIMEOUT_MS);
    });
    try {
      return await Promise.race([call(controller.signal), timeout]);
    } catch (error) {
      kind = error === TIMED_OUT ? "timeout" : "failure";
      const status = error instanceof Error && "status" in error ? error.status : undefined;
      logger.warn("gemini call failed", { operation, attempt, kind, status });
    } finally {
      clearTimeout(timer);
    }
  }
  throw new ProviderError(kind, `Gemini ${operation} ${kind} after ${GEMINI_ATTEMPTS} attempts`);
}

/** gemini-embedding-001 normalizes only its full 3,072-dimension output, so a shorter vector is scaled here. */
function normalize(values: number[]): number[] {
  const norm = Math.hypot(...values);
  if (!Number.isFinite(norm) || norm === 0) throw new Error("embedding has no length");
  return values.map((value) => value / norm);
}

export const geminiEmbedder: Embedder = {
  async embed(texts, task) {
    if (texts.length === 0) return [];
    return withRetry("embed", async (abortSignal) => {
      const response = await gemini().models.embedContent({
        model: GEMINI_EMBEDDING_MODEL,
        contents: texts,
        config: {
          taskType: TASK_TYPES[task],
          outputDimensionality: EMBEDDING_DIMENSIONS,
          abortSignal,
        },
      });
      const embeddings = response.embeddings ?? [];
      if (embeddings.length !== texts.length) throw new Error("wrong number of embeddings");
      return embeddings.map(({ values }) => {
        if (values?.length !== EMBEDDING_DIMENSIONS) throw new Error("wrong embedding size");
        return normalize(values);
      });
    });
  },
};

export const geminiLanguageModel: LanguageModel = {
  async generate({ system, prompt }) {
    return withRetry("generate", async (abortSignal) => {
      const response = await gemini().models.generateContent({
        model: GEMINI_GENERATION_MODEL,
        contents: prompt,
        config: { systemInstruction: system, abortSignal },
      });
      const text = response.text;
      if (!text) throw new Error("empty answer");
      return { text, tokens: response.usageMetadata?.totalTokenCount ?? 0 };
    });
  },
};

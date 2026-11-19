import "server-only";
import { createGoogle } from "@ai-sdk/google";
import { APICallError, createProviderRegistry, embedMany, generateText } from "ai";
import { type Env, getEnv } from "@/server/config/env";
import { logger } from "@/server/utils/logger";
import {
  AI_ATTEMPTS,
  AI_TIMEOUT_MS,
  type AiModelId,
  type AiProvider,
  EMBEDDING_DIMENSIONS,
  parseAiModelId,
} from "../constants/gateway.constants";
import { ProviderError } from "../errors";
import type { EmbedTask, Embedder, LanguageModel } from "../ports";

// The AI gateway, on the Vercel AI SDK (ADR 0014). Only adapters/ (this file and its test) may import `ai` or `@ai-sdk/*`. Owner: AI/RAG 1.
// Models are "provider:model" strings from AI_EMBEDDING_MODEL and AI_CHAT_MODEL, so switching models is an env change.
// Embedding rules: task type document for chunks and query for questions, same model on both sides,
// 1,536 dimensions, normalized, and the model name and pipeline version stored with each chunk.
// Never log the prompt, the question, document text or the key: logs carry the operation, model, attempt and status only.

type EmbedOptions = Parameters<typeof embedMany>[0]["providerOptions"];
type Provider = Parameters<typeof createProviderRegistry>[0][string];

/**
 * One entry per provider: how to build it from the environment, and its embedding options. The vector size goes
 * through the SDK's own `dimensions` setting, so only provider-specific options live here.
 */
const PROVIDERS: Record<
  AiProvider,
  { create: (env: Env) => Provider; embedOptions: (task: EmbedTask) => EmbedOptions }
> = {
  google: {
    create: (env) => createGoogle({ apiKey: env.GEMINI_API_KEY }),
    embedOptions: (task) => ({
      google: { taskType: task === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT" },
    }),
  },
};

function createRegistry() {
  const env = getEnv();
  const entries = Object.entries(PROVIDERS).map(([name, entry]) => [name, entry.create(env)]);
  return createProviderRegistry(Object.fromEntries(entries) as Record<AiProvider, Provider>);
}

let registry: ReturnType<typeof createRegistry> | undefined;
function providers() {
  registry ??= createRegistry();
  return registry;
}

/** The embedding model in use and its vector size. Store `model` with each chunk; the eval keys its cache on it. */
export function embeddingModelInfo(): { model: AiModelId; dimensions: number } {
  return { model: getEnv().AI_EMBEDDING_MODEL, dimensions: EMBEDDING_DIMENSIONS };
}

const TIMED_OUT = Symbol("timed out");

/**
 * Runs `call` with a timeout per attempt and one retry. The SDK's own retries are off (`maxRetries: 0`): they never
 * retry a hang and they wait 2 s first. A retry happens after a timeout or an error the SDK marks retryable (network,
 * 408, 409, 429, 5xx); anything else (a 400, a bad key, a malformed response) fails at once. Throws ProviderError when
 * no attempt succeeds. The race is on purpose: it is a hard deadline even if a provider package or fetch ignores the
 * abort signal.
 */
async function withRetry<T>(
  operation: string,
  model: AiModelId,
  call: (signal: AbortSignal) => Promise<T>,
) {
  for (let attempt = 1; ; attempt += 1) {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(TIMED_OUT);
      }, AI_TIMEOUT_MS);
    });
    try {
      return await Promise.race([call(controller.signal), timeout]);
    } catch (error) {
      const apiError = APICallError.isInstance(error) ? error : undefined;
      const kind = error === TIMED_OUT ? "timeout" : "failure";
      logger.warn("ai call failed", {
        operation,
        model,
        attempt,
        kind,
        status: apiError?.statusCode,
      });
      const retryable = kind === "timeout" || apiError?.isRetryable === true;
      if (!retryable || attempt === AI_ATTEMPTS) {
        throw new ProviderError(kind, `AI ${operation} ${kind} on ${model}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Some models (gemini-embedding-001 among them) normalize only their full-size output, so a shorter vector is scaled here. */
function normalize(values: number[]): number[] {
  const norm = Math.hypot(...values);
  if (!Number.isFinite(norm) || norm === 0) {
    throw new ProviderError("failure", "AI embed returned a zero vector");
  }
  return values.map((value) => value / norm);
}

export const gatewayEmbedder: Embedder = {
  async embed(texts, task) {
    if (texts.length === 0) return [];
    const modelId = getEnv().AI_EMBEDDING_MODEL;
    const parsed = parseAiModelId(modelId);
    if (!parsed) throw new ProviderError("failure", `AI embed model ${modelId} is not registered`);
    const model = providers().embeddingModel(modelId);
    // Only the provider call is retried: a response with the wrong shape will not fix itself on a second paid call.
    const { embeddings } = await withRetry("embed", modelId, (abortSignal) =>
      embedMany({
        model,
        values: texts,
        dimensions: EMBEDDING_DIMENSIONS,
        providerOptions: PROVIDERS[parsed.provider].embedOptions(task),
        maxRetries: 0,
        abortSignal,
      }),
    );
    if (embeddings.length !== texts.length) {
      throw new ProviderError("failure", "AI embed returned the wrong number of vectors");
    }
    return embeddings.map((values) => {
      if (values.length !== EMBEDDING_DIMENSIONS) {
        throw new ProviderError("failure", "AI embed returned a vector of the wrong size");
      }
      return normalize(values);
    });
  },
};

export const gatewayLanguageModel: LanguageModel = {
  async generate({ system, prompt }) {
    const modelId = getEnv().AI_CHAT_MODEL;
    const model = providers().languageModel(modelId);
    const result = await withRetry("generate", modelId, (abortSignal) =>
      generateText({ model, instructions: system, prompt, maxRetries: 0, abortSignal }),
    );
    if (!result.text) throw new ProviderError("failure", "AI generate returned no text");
    return { text: result.text, tokens: result.usage.totalTokens ?? 0 };
  },
};

import "server-only";

/**
 * Providers registered in adapters/gateway.ts. To add one: install `@ai-sdk/<name>`, add its name here, then the
 * type checker asks for its entry in PROVIDERS in that file.
 */
export const AI_PROVIDERS = ["google"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];
/** "provider:model", for example "google:gemini-embedding-001". Set by AI_EMBEDDING_MODEL and AI_CHAT_MODEL. */
export type AiModelId = `${AiProvider}:${string}`;

/**
 * Splits "provider:model". Undefined when the provider is not registered, the model part is empty or the value holds
 * any whitespace, so a stray space in the env stops the app at start-up instead of failing the first call.
 */
export function parseAiModelId(
  value: unknown,
): { provider: AiProvider; model: string } | undefined {
  if (typeof value !== "string" || /\s/.test(value)) return undefined;
  const separator = value.indexOf(":");
  const provider = AI_PROVIDERS.find((name) => name === value.slice(0, separator));
  const model = value.slice(separator + 1);
  return separator > 0 && provider && model ? { provider, model } : undefined;
}

// Draft models (PBI-004). PBI-020 and PBI-027 pick the final ones by measurement and set them in the environment.
export const DEFAULT_EMBEDDING_MODEL: AiModelId = "google:gemini-embedding-001";
export const DEFAULT_CHAT_MODEL: AiModelId = "google:gemini-3.5-flash-lite";

/** Matches the vector(768) column. Changing it needs a migration and a re-index. */
export const EMBEDDING_DIMENSIONS = 768;

/** Per attempt. A call gets one retry, so the worst case is twice this plus AI_RETRY_DELAY_MS. */
export const AI_TIMEOUT_MS = 15_000;
export const AI_ATTEMPTS = 2;
/** Wait before the retry that follows a retryable API error (429, 5xx), so it does not hit the same limit at once. */
export const AI_RETRY_DELAY_MS = 1_000;

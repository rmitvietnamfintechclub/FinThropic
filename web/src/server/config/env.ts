import "server-only";
import { z } from "zod";
import {
  type AiModelId,
  DEFAULT_CHAT_MODEL,
  DEFAULT_EMBEDDING_MODEL,
  parseAiModelId,
} from "@/server/ai/constants/gateway.constants";

// One place that knows which environment variables the app needs.
// A missing or empty variable stops the app and names the variable (PBI-001, AC3).

/** "provider:model" with a provider the AI gateway registers, so a typo fails at start-up, not on the first question. */
const modelId = (fallback: AiModelId) =>
  z.custom<AiModelId>((value) => parseAiModelId(value) !== undefined).default(fallback);

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  AI_EMBEDDING_MODEL: modelId(DEFAULT_EMBEDDING_MODEL),
  AI_CHAT_MODEL: modelId(DEFAULT_CHAT_MODEL),
});

export type Env = z.infer<typeof schema>;

export function readEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
    throw new Error(`Missing or invalid environment variable: ${names.join(", ")}`);
  }
  return result.data;
}

let cached: Env | undefined;
export function getEnv(): Env {
  cached ??= readEnv();
  return cached;
}

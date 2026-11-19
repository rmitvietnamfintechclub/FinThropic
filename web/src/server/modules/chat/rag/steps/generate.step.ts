import "server-only";
import { ProviderError } from "@/server/ai/errors";
import type { LanguageModel } from "@/server/ai/ports";
import { FALLBACK_REPLY } from "../../constants/chat.constants";
import { buildPrompt, SYSTEM_PROMPT } from "../prompt";
import type { RagContext, RagStep } from "../types";

/**
 * Ask the model to answer only from the retrieved chunks, with numbered citations.
 * A provider failure or timeout surfaces as ProviderError (a service error), never as the fallback reply.
 *
 * Owner: AI/RAG 1. PBI-004.
 */
export function createGenerateStep(model: LanguageModel): RagStep {
  return {
    name: "generate",
    async run(ctx: RagContext): Promise<RagContext> {
      const prompt = buildPrompt(ctx.rewritten ?? ctx.question, ctx.chunks);
      const { text } = await callModel(model, { system: SYSTEM_PROMPT, prompt });
      if (text.trim() === FALLBACK_REPLY) {
        return { ...ctx, answer: FALLBACK_REPLY, citations: [], outcome: "not_available" };
      }
      return {
        ...ctx,
        answer: text,
        citations: citationsIn(text, ctx.chunks),
        outcome: "answered",
      };
    },
  };
}

async function callModel(model: LanguageModel, input: Parameters<LanguageModel["generate"]>[0]) {
  try {
    return await model.generate(input);
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    const timedOut =
      error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    throw new ProviderError(timedOut ? "timeout" : "failure", "language model call failed");
  }
}

/** Each [n] in the text, in order of first use, mapped to the nth retrieved chunk. Numbers with no chunk are left to checkCitations. */
function citationsIn(text: string, chunks: RagContext["chunks"]): RagContext["citations"] {
  const numbers = new Set([...text.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1])));
  return [...numbers]
    .map((n) => chunks[n - 1])
    .filter((chunk) => chunk !== undefined)
    .map(({ chunkId, documentName, page }) => ({ chunkId, documentName, page }));
}

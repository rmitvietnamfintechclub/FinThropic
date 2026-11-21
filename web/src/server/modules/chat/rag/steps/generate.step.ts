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
      if (text.trim() === "") {
        throw new ProviderError("failure", "language model returned no text");
      }
      if (isFallback(text)) {
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

/**
 * The model may drop the full stop, quote the sentence or tack a citation onto it.
 * Compare with those stripped, so a near-miss is still a refusal and never an answer.
 */
function isFallback(text: string): boolean {
  return bareSentence(text) === bareSentence(FALLBACK_REPLY);
}

function bareSentence(text: string): string {
  let current = text;
  let previous;
  do {
    previous = current;
    current = current
      .trim()
      .replace(/(\[\d+(?:\s*,\s*\d+)*\]\s*)+$/, "")
      .replace(/^["'\u201c\u201d\u2018\u2019`]+|["'\u201c\u201d\u2018\u2019`]+$/g, "")
      .replace(/[.!?\u2026]+$/, "");
  } while (current !== previous);
  return current;
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

/** Each [n] in the text (also [1, 2] lists), in order of first use, mapped to the nth retrieved chunk and carrying n. Numbers with no chunk are left to checkCitations. */
function citationsIn(text: string, chunks: RagContext["chunks"]): RagContext["citations"] {
  const numbers = new Set(
    [...text.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g)].flatMap((match) =>
      match[1].split(",").map((n) => Number(n.trim())),
    ),
  );
  return [...numbers].flatMap((number) => {
    const chunk = chunks[number - 1];
    return chunk
      ? [{ number, chunkId: chunk.chunkId, documentName: chunk.documentName, page: chunk.page }]
      : [];
  });
}

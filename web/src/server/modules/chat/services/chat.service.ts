import "server-only";
import type { ChatService } from "../interfaces/chat.interface";
import type { RagContext } from "../rag/types";

/** Runs the answering pipeline. runPipeline in production, a fake in tests. */
export type PipelineRunner = (
  input: Pick<RagContext, "question" | "history">,
) => Promise<RagContext>;

// Service: business rules. Receives the pipeline runner, so a test can pass a fake.
export class DefaultChatService implements ChatService {
  constructor(private readonly runPipeline: PipelineRunner) {}

  // conversationId is accepted but not used yet: Sprint 1 saves no conversations, so every question
  // starts with an empty history. Conversations and follow-up questions come with PBI-030.
  async ask({ question }: { conversationId?: string; question: string }) {
    const ctx = await this.runPipeline({ question, history: [] });

    // The pipeline always ends with an outcome and an answer: the threshold step gives the fallback
    // reply, the generate step gives an answer or the fallback. Anything else is a bug, not a reply.
    if (ctx.outcome === undefined || ctx.answer === undefined) {
      throw new Error("the answering pipeline ended without an answer");
    }

    return {
      text: ctx.answer,
      citations: ctx.outcome === "answered" ? ctx.citations : [],
      outcome: ctx.outcome,
    };
  }
}

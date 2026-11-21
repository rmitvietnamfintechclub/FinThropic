import "server-only";

export interface Citation {
  /** The `[n]` marker in the answer text that this citation resolves. */
  number: number;
  chunkId: string;
  documentName: string;
  page: number;
}

export interface ChatService {
  ask(input: {
    conversationId?: string;
    question: string;
  }): Promise<{ text: string; citations: Citation[]; outcome: "answered" | "not_available" }>;
}

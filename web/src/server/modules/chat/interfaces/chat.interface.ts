import "server-only";

export interface Citation {
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

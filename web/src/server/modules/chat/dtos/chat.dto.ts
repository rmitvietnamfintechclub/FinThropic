import type { ChatAnswerDto } from "@/contracts/chat.dto";
import type { ChatService } from "../interfaces/chat.interface";

// DTO: what leaves the module. The shape is the shared contract, so the frontend parses the same
// definition. Fields are copied by name, so nothing internal to the pipeline can leak out.
export type ChatAnswerResponseDto = ChatAnswerDto;

type ChatAnswer = Awaited<ReturnType<ChatService["ask"]>>;

export function toChatAnswerDto(answer: ChatAnswer, requestId: string): ChatAnswerResponseDto {
  return {
    text: answer.text,
    citations: answer.citations.map((citation) => ({
      number: citation.number,
      chunkId: citation.chunkId,
      documentName: citation.documentName,
      page: citation.page,
    })),
    outcome: answer.outcome,
    requestId,
  };
}

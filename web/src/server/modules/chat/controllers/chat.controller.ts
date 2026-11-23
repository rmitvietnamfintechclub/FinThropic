import "server-only";
import { ProviderError } from "@/server/ai/errors";
import type { Handler } from "@/server/middlewares/withErrorHandler";
import { toChatAnswerDto } from "../dtos/chat.dto";
import type { ChatService } from "../interfaces/chat.interface";
import { readChatRequest } from "../validators/chat.validator";

// Controller: HTTP in, HTTP out. Validates, calls one service, shapes the response.
// `isEnabled` is the CHAT_API_ENABLED flag: the route has no sign-in yet, so it answers only where
// the flag is on (a developer's machine), and looks like it does not exist everywhere else.
export function createChatController(service: ChatService, isEnabled: () => boolean): Handler {
  return async function handleChat(request, { requestId }) {
    if (!isEnabled()) {
      return Response.json({ error: "not_found", requestId }, { status: 404 });
    }

    const input = await readChatRequest(request);

    try {
      const answer = await service.ask(input);
      return Response.json(toChatAnswerDto(answer, requestId));
    } catch (error) {
      // The AI provider failed or timed out: a dependency is down (503), never the fallback reply,
      // so a member is not told "not in the documents" when the answer may well be there.
      if (error instanceof ProviderError) {
        return Response.json({ error: "ai_unavailable", requestId }, { status: 503 });
      }
      throw error;
    }
  };
}

import { type ChatRequestDto, chatRequestDtoSchema } from "@/contracts/chat.dto";

// Validator: every input is checked here before a service sees it. The rules are the shared contract,
// so the frontend and the backend agree on what a valid question is.

/**
 * Reads and checks the body of POST /api/chat.
 * A body that is not JSON is treated like an empty one, so both end as 400 invalid_request
 * (a ZodError, which withErrorHandler turns into 400) instead of a 500.
 * Unknown fields are dropped, so nothing the contract does not name reaches the service.
 */
export async function readChatRequest(request: Request): Promise<ChatRequestDto> {
  const body: unknown = await request.json().catch(() => undefined);
  return chatRequestDtoSchema.parse(body);
}

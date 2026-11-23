import { withErrorHandler } from "@/server/middlewares/withErrorHandler";
import { chatController } from "@/server/modules/chat";

// Route: a thin file. POST /api/chat asks a question and returns the answer object (docs/ENDPOINTS.md).
// OPEN AND TEMPORARY: no sign-in until PBI-017 and PBI-018 wrap it in withAuth and withRole.
// Until then it answers only where CHAT_API_ENABLED=true; everywhere else, production included, 404.
export const POST = withErrorHandler(chatController);

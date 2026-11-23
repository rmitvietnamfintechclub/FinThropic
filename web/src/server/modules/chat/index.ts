import "server-only";
// The only door into the chat module. Other modules and routes import from here, never from inner folders.
import { getEnv } from "@/server/config/env";
import { createChatController } from "./controllers/chat.controller";
import { runPipeline } from "./rag/pipeline";
import { DefaultChatService } from "./services/chat.service";

export type * from "./interfaces/chat.interface";

// The flag is read on each request, not at import, so importing this module never needs the
// environment and a change of the flag takes effect on the next deploy without code changes.
export const chatController = createChatController(
  new DefaultChatService((input) => runPipeline(input)),
  () => getEnv().CHAT_API_ENABLED,
);

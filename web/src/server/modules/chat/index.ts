import "server-only";

// The only door into the chat module. Other modules import from here, never from inner folders.
export type * from "./interfaces/chat.interface";

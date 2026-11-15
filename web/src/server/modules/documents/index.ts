import "server-only";

// The only door into the documents module. Other modules import from here, never from inner folders.
export type * from "./interfaces/documents.interface";

import "server-only";

// The only door into the documents module. Other modules import from here, never from inner folders.
export type * from "./interfaces/documents.interface";

// Search over chunks. Build it with createUserClient(token), never the admin client.
export { SupabaseSearchRepository } from "./repositories/search.repository";

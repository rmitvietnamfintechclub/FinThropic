import "server-only";

export type AccessLevel = "member" | "ebmb";
export type DocumentStatus = "uploading" | "processing" | "ready" | "failed";

export interface DocumentsService {
  createBatch(
    files: { name: string; size: number }[],
    level: AccessLevel,
  ): Promise<{ batchId: string }>;
  reclassify(documentId: string, level: AccessLevel): Promise<void>;
  remove(documentId: string): Promise<void>;
  /** Search follows the access level of the signed-in person. Used by the chat module. */
  searchChunks(input: { embedding: number[]; text: string; limit: number }): Promise<ChunkMatch[]>;
}

/**
 * One chunk found by search. `score` is the cosine similarity to the question
 * (`1 - distance`, higher is closer), the number the relevance threshold uses.
 */
export interface ChunkMatch {
  chunkId: string;
  documentId: string;
  documentName: string;
  text: string;
  page: number;
  score: number;
}

/** Search queries. Give it the signed-in person's client, so Row Level Security picks the level. */
export interface SearchRepository {
  /** Nearest chunks first; at most `limit` (1 to 50). */
  searchVector(embedding: number[], limit: number): Promise<ChunkMatch[]>;
}

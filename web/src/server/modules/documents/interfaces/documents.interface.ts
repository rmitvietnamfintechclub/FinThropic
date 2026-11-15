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
  searchChunks(input: {
    embedding: number[];
    text: string;
    limit: number;
  }): Promise<{ chunkId: string; text: string; page: number }[]>;
}

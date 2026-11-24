import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/config/database.types";
import type { ChunkMatch, SearchRepository } from "../interfaces/documents.interface";

// Repository: the only layer that talks to the database. No business rules here.
// The client must be the signed-in person's (createUserClient): the search functions are
// security invoker, so Row Level Security decides which chunks come back. The admin client
// bypasses it and must never be passed here for a member's question.
export class SupabaseSearchRepository implements SearchRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async searchVector(embedding: number[], limit: number): Promise<ChunkMatch[]> {
    const { data, error } = await this.db.rpc("search_chunks_vector", {
      // pgvector reads a vector from its text form "[0.1,0.2,...]".
      query_embedding: JSON.stringify(embedding),
      match_count: limit,
    });
    if (error) throw new Error(`search_chunks_vector failed: ${error.message}`);
    return (data ?? []).map((row) => ({
      chunkId: row.chunk_id,
      documentId: row.document_id,
      documentName: row.document_name,
      text: row.chunk_text,
      page: row.page,
      score: row.similarity,
    }));
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/server/config/database.types";
import { SupabaseSearchRepository } from "./search.repository";

// A fake client that records the call and answers with what the test gives it.
function fakeClient(answer: { data: unknown; error: { message: string } | null }) {
  const calls: { fn: string; args: unknown }[] = [];
  const client = {
    rpc: async (fn: string, args: unknown) => {
      calls.push({ fn, args });
      return answer;
    },
  } as unknown as SupabaseClient<Database>;
  return { client, calls };
}

describe("SupabaseSearchRepository.searchVector", () => {
  it("sends the vector as pgvector text and the limit", async () => {
    const { client, calls } = fakeClient({ data: [], error: null });
    await new SupabaseSearchRepository(client).searchVector([0.5, -0.25], 5);
    expect(calls).toEqual([
      { fn: "search_chunks_vector", args: { query_embedding: "[0.5,-0.25]", match_count: 5 } },
    ]);
  });

  it("maps database columns to ChunkMatch, similarity as score", async () => {
    const { client } = fakeClient({
      data: [
        {
          chunk_id: "c1",
          document_id: "d1",
          document_name: "Club handbook",
          chunk_text: "Budget requests go to the Treasurer.",
          page: 4,
          similarity: 0.82,
        },
      ],
      error: null,
    });
    expect(await new SupabaseSearchRepository(client).searchVector([1], 5)).toEqual([
      {
        chunkId: "c1",
        documentId: "d1",
        documentName: "Club handbook",
        text: "Budget requests go to the Treasurer.",
        page: 4,
        score: 0.82,
      },
    ]);
  });

  it("returns an empty list when nothing matches", async () => {
    const { client } = fakeClient({ data: null, error: null });
    expect(await new SupabaseSearchRepository(client).searchVector([1], 5)).toEqual([]);
  });

  it("throws when the database refuses, instead of answering with nothing", async () => {
    const { client } = fakeClient({ data: null, error: { message: "permission denied" } });
    await expect(new SupabaseSearchRepository(client).searchVector([1], 5)).rejects.toThrow(
      "search_chunks_vector failed: permission denied",
    );
  });
});

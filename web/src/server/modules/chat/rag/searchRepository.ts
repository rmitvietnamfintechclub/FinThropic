import "server-only";
import { createAdminClient } from "@/server/config/supabase";
import { type SearchRepository, SupabaseSearchRepository } from "@/server/modules/documents";

/**
 * TEMPORARY, DEVELOPMENT ONLY (decided 25 Nov 2026 on #69).
 *
 * Sprint 1 has no sign-in, and the read rules in migration 0005 give an anonymous caller no rows, so
 * a member-level client would always find nothing. Until PBI-017.1 (#110) reads the person from the
 * session, search uses the admin client, which skips Row Level Security.
 *
 * It is reachable only where CHAT_API_ENABLED=true: the chat controller answers 404 everywhere else,
 * production included, before the pipeline runs. Index only synthetic files on a machine with the
 * flag on. Replace this with createUserClient(session.accessToken) in #110 and delete this file.
 */
export function searchRepositoryForSprint1(): SearchRepository {
  return new SupabaseSearchRepository(createAdminClient());
}

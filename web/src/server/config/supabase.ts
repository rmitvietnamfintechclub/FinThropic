import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getEnv } from "./env";

// Two clients, on purpose (docs/adr/0005 and Appendix G):
// 1. createUserClient runs with the signed-in person's token, so Row Level Security applies.
//    Use it for search and chat.
// 2. createAdminClient uses the secret key and BYPASSES Row Level Security.
//    Use it only for admin jobs and the indexing worker, never for a request that answers a member.

export function createUserClient(accessToken?: string) {
  const env = getEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createAdminClient() {
  const env = getEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

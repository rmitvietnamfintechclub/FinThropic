import "server-only";
import { getEnv } from "@/server/config/env";
import { DATABASE_PING_TIMEOUT_MS } from "../constants/health.constants";
import type { HealthRepository } from "../interfaces/health.interface";

// Repository: the only layer that talks to the database. No business rules here.
export class SupabaseHealthRepository implements HealthRepository {
  async pingDatabase(): Promise<boolean> {
    const env = getEnv();
    try {
      const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
        signal: AbortSignal.timeout(DATABASE_PING_TIMEOUT_MS),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

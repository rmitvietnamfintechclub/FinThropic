import type { HealthReport } from "../models/health.model";

// Interface: the only thing other modules may use (module "door").
export interface HealthService {
  check(options: { deep: boolean }): Promise<HealthReport>;
}

// Port the service needs from the data layer. A fake in tests, Supabase in production.
export interface HealthRepository {
  pingDatabase(): Promise<boolean>;
}

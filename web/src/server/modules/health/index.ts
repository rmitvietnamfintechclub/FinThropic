import "server-only";
// The module's only door. Other modules and routes import from here, never from inner folders.
import { createHealthController } from "./controllers/health.controller";
import { SupabaseHealthRepository } from "./repositories/health.repository";
import { DefaultHealthService } from "./services/health.service";

export type { HealthService } from "./interfaces/health.interface";

export const healthController = createHealthController(
  new DefaultHealthService(new SupabaseHealthRepository()),
);

import "server-only";
import type { HealthRepository, HealthService } from "../interfaces/health.interface";
import type { CheckState, HealthReport } from "../models/health.model";

// Service: business rules. Receives its repository, so a test can pass a fake.
export class DefaultHealthService implements HealthService {
  constructor(
    private readonly repository: HealthRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async check({ deep }: { deep: boolean }): Promise<HealthReport> {
    let database: CheckState = "skipped";
    if (deep) {
      database = (await this.repository.pingDatabase()) ? "ok" : "fail";
    }
    return { status: database === "fail" ? "degraded" : "ok", database, checkedAt: this.now() };
  }
}

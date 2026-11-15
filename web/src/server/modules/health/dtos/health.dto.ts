import type { HealthDto } from "@/contracts/health.dto";
import type { HealthReport } from "../models/health.model";

// DTO: what leaves the module. The shape is the shared contract, so the frontend parses the same
// definition. Hides internal fields; dates become strings.
export type HealthResponseDto = HealthDto;

export function toHealthResponseDto(report: HealthReport): HealthResponseDto {
  return {
    status: report.status,
    database: report.database,
    checkedAt: report.checkedAt.toISOString(),
  };
}

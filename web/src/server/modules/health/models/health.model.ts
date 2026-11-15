// Model: the shape of the data inside the module. No HTTP, no SQL here.
export type CheckState = "ok" | "fail" | "skipped";

export interface HealthReport {
  status: "ok" | "degraded";
  database: CheckState;
  checkedAt: Date;
}

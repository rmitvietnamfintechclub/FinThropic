import { describe, expect, it } from "vitest";
import { DefaultHealthService } from "./health.service";

const fixedNow = () => new Date("2026-11-16T09:00:00Z");

describe("DefaultHealthService", () => {
  it("is ok without touching the database on a shallow check", async () => {
    let pinged = false;
    const service = new DefaultHealthService(
      { pingDatabase: async () => ((pinged = true), true) },
      fixedNow,
    );
    const report = await service.check({ deep: false });
    expect(report).toMatchObject({ status: "ok", database: "skipped" });
    expect(pinged).toBe(false);
  });

  it("is degraded when the database does not answer on a deep check", async () => {
    const service = new DefaultHealthService({ pingDatabase: async () => false }, fixedNow);
    expect(await service.check({ deep: true })).toMatchObject({
      status: "degraded",
      database: "fail",
    });
  });
});

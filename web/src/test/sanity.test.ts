import { describe, expect, it } from "vitest";
import type {} from "@/test/server-only";

// Proves the runner and the @ alias work. Deleted when PBI-044.4 adds the first real tests.
describe("test setup", () => {
  it("runs and resolves the @ alias", () => {
    expect(1 + 1).toBe(2);
  });
});

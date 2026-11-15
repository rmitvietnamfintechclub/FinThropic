import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "./logger";

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.LOG_LEVEL;
});

describe("logger", () => {
  it("writes one JSON line with level, message, time and fields", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("indexed", { documentId: "d1" });
    const line = JSON.parse(String(spy.mock.calls[0][0]));
    expect(line).toMatchObject({ level: "info", message: "indexed", documentId: "d1" });
    expect(typeof line.time).toBe("string");
  });

  it("drops lines below LOG_LEVEL", () => {
    process.env.LOG_LEVEL = "error";
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("hidden");
    expect(spy).not.toHaveBeenCalled();
  });

  it("sends errors to stderr", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("failed", { requestId: "r1" });
    expect(JSON.parse(String(spy.mock.calls[0][0]))).toMatchObject({
      level: "error",
      requestId: "r1",
    });
  });
});

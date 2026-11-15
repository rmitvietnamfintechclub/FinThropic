import { afterEach, describe, expect, it, vi } from "vitest";
import { ContractError } from "@/utils/http";
import { fetchHealth } from "./health.service";

afterEach(() => vi.unstubAllGlobals());

function answer(body: unknown, status = 200) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })));
}

describe("fetchHealth", () => {
  it("drops fields the contract does not know", async () => {
    answer({ status: "ok", database: "skipped", checkedAt: "x", secret: "leak", isAdmin: true });
    expect(await fetchHealth(false)).toEqual({ status: "ok", database: "skipped", checkedAt: "x" });
  });

  it("rejects a response with a wrong type", async () => {
    answer({ status: "ok", database: "skipped", checkedAt: 42 });
    await expect(fetchHealth(false)).rejects.toBeInstanceOf(ContractError);
  });

  it("rejects a body that is not the contract at all", async () => {
    answer("<html>proxy page</html>");
    await expect(fetchHealth(false)).rejects.toBeInstanceOf(ContractError);
  });
});

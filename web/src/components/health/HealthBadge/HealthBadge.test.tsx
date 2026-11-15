import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HealthBadge } from ".";

afterEach(() => vi.unstubAllGlobals());

describe("HealthBadge", () => {
  it("shows the server as up when the route answers ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: "ok", database: "skipped", checkedAt: "x" }), {
          status: 200,
        }),
      ),
    );
    render(<HealthBadge />);
    expect(await screen.findByText("Server is up")).toBeInTheDocument();
  });

  it("shows a clear message when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<HealthBadge />);
    expect(await screen.findByText("Server not reachable")).toBeInTheDocument();
  });
});

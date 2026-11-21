import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Embedder } from "@/server/ai/ports";
import { EmbeddingCache, cacheKey, cachedEmbedder } from "./embeddingCache";

function countingEmbedder() {
  const sent: string[][] = [];
  const embedder: Embedder = {
    async embed(texts) {
      sent.push(texts);
      return texts.map((text) => [text.length, 1]);
    },
  };
  return { embedder, sent };
}

const dirs: string[] = [];
function tempFile(): string {
  const dir = mkdtempSync(join(tmpdir(), "eval-cache-"));
  dirs.push(dir);
  return join(dir, "nested", "cache.json");
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("cacheKey", () => {
  it("changes with the model, the task and the text", () => {
    const base = cacheKey("m1", "document", "fee");
    expect(cacheKey("m2", "document", "fee")).not.toBe(base);
    expect(cacheKey("m1", "query", "fee")).not.toBe(base);
    expect(cacheKey("m1", "document", "fees")).not.toBe(base);
    expect(cacheKey("m1", "document", "fee")).toBe(base);
  });

  it("does not contain the text", () => {
    expect(cacheKey("m1", "query", "secret question")).not.toContain("secret");
  });
});

describe("EmbeddingCache", () => {
  it.each([
    ["empty", ""],
    ["truncated", '{"m1|query|abc":[0.1,'],
    ["of the wrong shape", '{"m1|query|abc":"not a vector"}'],
  ])("names the file when it is %s", (_, content) => {
    const path = tempFile();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    expect(() => new EmbeddingCache(path)).toThrow(
      `embedding cache ${path} is not a valid cache file`,
    );
  });
});

describe("cachedEmbedder", () => {
  it("sends each new text once and reuses the saved vectors on the next run", async () => {
    const path = tempFile();
    const first = countingEmbedder();
    const run1 = cachedEmbedder(first.embedder, "m1", new EmbeddingCache(path));
    expect(await run1.embed(["a", "bb", "a"], "document")).toEqual([
      [1, 1],
      [2, 1],
      [1, 1],
    ]);
    expect(first.sent).toEqual([["a", "bb"]]);
    expect(run1.stats).toEqual({ fromCache: 0, embedded: 2 });
    expect(readFileSync(path, "utf8")).not.toContain('"bb"');

    const second = countingEmbedder();
    const run2 = cachedEmbedder(second.embedder, "m1", new EmbeddingCache(path));
    await run2.embed(["bb", "a"], "document");
    await run2.embed(["a"], "query");
    expect(second.sent).toEqual([["a"]]); // only the query, a different task
    expect(run2.stats).toEqual({ fromCache: 2, embedded: 1 });
  });

  it("does not reuse vectors from another model", async () => {
    const path = tempFile();
    await cachedEmbedder(countingEmbedder().embedder, "m1", new EmbeddingCache(path)).embed(
      ["a"],
      "query",
    );
    const other = countingEmbedder();
    await cachedEmbedder(other.embedder, "m2", new EmbeddingCache(path)).embed(["a"], "query");
    expect(other.sent).toEqual([["a"]]);
  });

  it("sends large inputs in batches of 100", async () => {
    const { embedder, sent } = countingEmbedder();
    const texts = Array.from({ length: 250 }, (_, i) => `text ${i}`);
    await cachedEmbedder(embedder, "m1", new EmbeddingCache(null)).embed(texts, "document");
    expect(sent.map((batch) => batch.length)).toEqual([100, 100, 50]);
  });

  it("fails when the embedder returns the wrong number of vectors", async () => {
    const broken: Embedder = { embed: async () => [[1]] };
    await expect(
      cachedEmbedder(broken, "m1", new EmbeddingCache(null)).embed(["a", "b"], "query"),
    ).rejects.toThrow("embedder returned 1 vectors for 2 texts");
  });
});

import "server-only";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import type { EmbedTask, Embedder } from "@/server/ai/ports";
import { EMBED_BATCH_SIZE } from "./constants";

// Vectors already paid for are kept in a JSON file keyed by model, task and a hash of the text,
// so a rerun spends no free-tier quota. The file holds vectors and hashes only, never the text.

const cacheFileSchema = z.record(z.string(), z.array(z.number()));

export function cacheKey(model: string, task: EmbedTask, text: string): string {
  const hash = createHash("sha256").update(text).digest("hex");
  return `${model}|${task}|${hash}`;
}

export class EmbeddingCache {
  private entries = new Map<string, number[]>();

  constructor(private readonly path: string | null) {
    if (path && existsSync(path)) {
      const parsed = cacheFileSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
      if (!parsed.success) throw new Error(`embedding cache ${path} is not a valid cache file`);
      this.entries = new Map(Object.entries(parsed.data));
    }
  }

  get size(): number {
    return this.entries.size;
  }

  get(key: string): number[] | undefined {
    return this.entries.get(key);
  }

  set(key: string, vector: number[]): void {
    this.entries.set(key, vector);
  }

  save(): void {
    if (!this.path) return;
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(Object.fromEntries(this.entries)));
  }
}

export interface EmbedStats {
  fromCache: number;
  embedded: number;
}

/**
 * Wraps an Embedder: texts found in the cache are not sent again, the rest go in batches.
 * The cache is saved after each batch, so a run stopped by a quota error keeps what it paid for.
 */
export function cachedEmbedder(
  inner: Embedder,
  model: string,
  cache: EmbeddingCache,
  stats: EmbedStats = { fromCache: 0, embedded: 0 },
): Embedder & { stats: EmbedStats } {
  return {
    stats,
    async embed(texts, task) {
      const keys = texts.map((text) => cacheKey(model, task, text));
      const notCached = keys.filter((key) => cache.get(key) === undefined);
      const missing = [...new Set(notCached)];
      const textByKey = new Map(keys.map((key, i) => [key, texts[i]]));
      stats.fromCache += texts.length - notCached.length;
      for (let start = 0; start < missing.length; start += EMBED_BATCH_SIZE) {
        const batch = missing.slice(start, start + EMBED_BATCH_SIZE);
        const vectors = await inner.embed(
          batch.map((key) => textByKey.get(key) as string),
          task,
        );
        if (vectors.length !== batch.length) {
          throw new Error(`embedder returned ${vectors.length} vectors for ${batch.length} texts`);
        }
        batch.forEach((key, i) => cache.set(key, vectors[i]));
        stats.embedded += batch.length;
        cache.save();
      }
      return keys.map((key) => cache.get(key) as number[]);
    },
  };
}

import "server-only";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import type { Embedder } from "@/server/ai/ports";
import { EmbeddingCache, cachedEmbedder } from "./embeddingCache";
import { evaluateRetrieval } from "./evaluate";
import { formatReport } from "./formatReport";
import { InputError, checkInputs, chunkRowSchema, parseJsonl, questionRowSchema } from "./inputs";

// Command line entry. Run from web/ (see README.md next to this file):
//   bun run eval:retrieval --chunks <file> --questions <file> [--embedder fake|gemini]

const REPO_ROOT = resolve(import.meta.dirname, "../../../../..");
const PRIVATE_DIR = resolve(REPO_ROOT, "fixtures/private/eval");

function git(args: string[]): string | null {
  try {
    return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

/**
 * The embedders this script can use. `model` is part of the cache key: change it when the model or
 * its settings change, so old vectors are not reused. Adapters load on demand, so a fake run never
 * touches the Gemini adapter or its configuration.
 * TODO(#65): build the Gemini label from the model and dimensions the adapter exports.
 */
const EMBEDDERS = new Map<string, { model: string; load: () => Promise<Embedder> }>([
  [
    "fake",
    {
      model: "fake-word-hash-v1",
      load: async () => (await import("@/server/ai/adapters/fake")).fakeWordEmbedder,
    },
  ],
  [
    "gemini",
    {
      model: "gemini-embedding-001@1536",
      load: async () => (await import("@/server/ai/adapters/gemini")).geminiEmbedder,
    },
  ],
]);

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      chunks: { type: "string" },
      questions: { type: "string" },
      embedder: { type: "string", default: "fake" },
      out: { type: "string" },
      cache: { type: "string", default: resolve(PRIVATE_DIR, "embedding-cache.json") },
      "no-cache": { type: "boolean", default: false },
    },
  });
  if (!values.chunks || !values.questions) {
    process.stderr.write(
      "usage: bun run eval:retrieval --chunks <chunks.jsonl> --questions <questions.jsonl> " +
        "[--embedder fake|gemini] [--out <results.json>] [--cache <file> | --no-cache]\n",
    );
    return 2;
  }
  const embedderName = values.embedder;
  const choice = EMBEDDERS.get(embedderName);
  if (!choice) {
    process.stderr.write(`--embedder must be one of: ${[...EMBEDDERS.keys()].join(", ")}\n`);
    return 2;
  }
  const { model } = choice;

  const chunksPath = resolve(values.chunks);
  const questionsPath = resolve(values.questions);
  const chunks = parseJsonl(readFileSync(chunksPath, "utf8"), chunkRowSchema, values.chunks);
  const questions = parseJsonl(
    readFileSync(questionsPath, "utf8"),
    questionRowSchema,
    values.questions,
  );
  checkInputs(chunks, questions);

  const cache = new EmbeddingCache(values["no-cache"] ? null : resolve(values.cache));
  const embedder = cachedEmbedder(await choice.load(), model, cache);
  const report = await evaluateRetrieval(chunks, questions, embedder);

  const commit = git(["rev-parse", "HEAD"]) ?? "unknown";
  const dirty = (git(["status", "--porcelain"]) ?? "") !== "";
  const outPath = resolve(
    values.out ?? resolve(PRIVATE_DIR, `results/retrieval-${commit.slice(0, 12)}.json`),
  );
  const results = {
    kind: "retrieval-smoke-eval",
    commit,
    dirty,
    createdAt: new Date().toISOString(),
    embedder: embedderName,
    model,
    inputs: {
      chunks: relative(REPO_ROOT, chunksPath),
      questions: relative(REPO_ROOT, questionsPath),
    },
    embeddings: embedder.stats,
    ...report,
  };
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(results, null, 2)}\n`);

  const header = `Retrieval smoke eval, ${embedderName} (${model}), commit ${commit.slice(0, 12)}${dirty ? " +local changes" : ""}`;
  process.stdout.write(`${formatReport(report, header)}\n\n`);
  process.stdout.write(
    `Embeddings: ${embedder.stats.fromCache} from cache, ${embedder.stats.embedded} new\n`,
  );
  process.stdout.write(`Results: ${outPath}\n`);
  return 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    if (error instanceof InputError) {
      process.stderr.write(`Invalid input:\n${error.problems.map((p) => `  ${p}`).join("\n")}\n`);
    } else {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    }
    process.exit(1);
  },
);

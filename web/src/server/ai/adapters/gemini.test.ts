import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EMBEDDING_DIMENSIONS,
  GEMINI_ATTEMPTS,
  GEMINI_TIMEOUT_MS,
} from "../constants/gemini.constants";
import { ProviderError } from "../errors";
import { geminiEmbedder, geminiLanguageModel } from "./gemini";

// The SDK is mocked: no network, no real key.
const sdk = vi.hoisted(() => ({
  embedContent: vi.fn(),
  generateContent: vi.fn(),
  apiKeys: [] as unknown[],
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { embedContent: sdk.embedContent, generateContent: sdk.generateContent };
    constructor(options: { apiKey: string }) {
      sdk.apiKeys.push(options.apiKey);
    }
  },
}));

const FAKE_KEY = "fake-gemini-key-for-tests";
vi.mock("@/server/config/env", () => ({ getEnv: () => ({ GEMINI_API_KEY: FAKE_KEY }) }));

const QUESTION = "What is the budget request process?";
const SYSTEM = "Answer only from the club documents.";

/** A raw vector of the right size whose length is not 1, as gemini-embedding-001 returns when truncated. */
function rawVector(seed: number): number[] {
  return Array.from({ length: EMBEDDING_DIMENSIONS }, (_, index) => ((index % 13) + seed) / 10);
}

let logSpies: { mock: { calls: unknown[][] } }[] = [];
function logged(): string {
  return logSpies.flatMap((spy) => spy.mock.calls.flat()).join("\n");
}

beforeEach(() => {
  sdk.embedContent.mockReset();
  sdk.generateContent.mockReset();
  logSpies = (["log", "warn", "error"] as const).map((method) =>
    vi.spyOn(console, method).mockImplementation(() => {}),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("geminiEmbedder", () => {
  it("returns one unit-length vector of 1,536 numbers per text", async () => {
    sdk.embedContent.mockResolvedValue({
      embeddings: [{ values: rawVector(1) }, { values: rawVector(2) }],
    });

    const vectors = await geminiEmbedder.embed(["first chunk", "second chunk"], "document");

    expect(vectors).toHaveLength(2);
    for (const vector of vectors) {
      expect(vector).toHaveLength(EMBEDDING_DIMENSIONS);
      expect(Math.hypot(...vector)).toBeCloseTo(1, 10);
    }
    expect(sdk.apiKeys).toContain(FAKE_KEY);
  });

  it.each([
    ["query", "RETRIEVAL_QUERY"],
    ["document", "RETRIEVAL_DOCUMENT"],
  ] as const)("sends task type %s as %s with 1,536 dimensions", async (task, taskType) => {
    sdk.embedContent.mockResolvedValue({ embeddings: [{ values: rawVector(1) }] });

    await geminiEmbedder.embed([QUESTION], task);

    expect(sdk.embedContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-embedding-001",
        contents: [QUESTION],
        config: expect.objectContaining({
          taskType,
          outputDimensionality: EMBEDDING_DIMENSIONS,
        }),
      }),
    );
  });

  it("makes no call for an empty list", async () => {
    expect(await geminiEmbedder.embed([], "query")).toEqual([]);
    expect(sdk.embedContent).not.toHaveBeenCalled();
  });

  it("throws ProviderError('timeout') after one retry when the provider hangs", async () => {
    vi.useFakeTimers();
    sdk.embedContent.mockReturnValue(new Promise(() => {}));

    const result = geminiEmbedder.embed([QUESTION], "query");
    const assertion = expect(result).rejects.toMatchObject({
      name: "ProviderError",
      kind: "timeout",
    });
    await vi.advanceTimersByTimeAsync(GEMINI_TIMEOUT_MS * GEMINI_ATTEMPTS);
    await assertion;

    expect(sdk.embedContent).toHaveBeenCalledTimes(GEMINI_ATTEMPTS);
    const signals = sdk.embedContent.mock.calls.map(([params]) => params.config.abortSignal);
    expect(signals.every((signal: AbortSignal) => signal.aborted)).toBe(true);
  });

  it("succeeds when the retry succeeds", async () => {
    sdk.embedContent
      .mockRejectedValueOnce(Object.assign(new Error("unavailable"), { status: 503 }))
      .mockResolvedValueOnce({ embeddings: [{ values: rawVector(3) }] });

    const vectors = await geminiEmbedder.embed([QUESTION], "query");

    expect(vectors).toHaveLength(1);
    expect(sdk.embedContent).toHaveBeenCalledTimes(2);
  });

  it("throws ProviderError('failure') when the vector has the wrong size", async () => {
    sdk.embedContent.mockResolvedValue({ embeddings: [{ values: [0.1, 0.2] }] });

    const error = await geminiEmbedder.embed([QUESTION], "query").catch((caught) => caught);

    expect(error).toBeInstanceOf(ProviderError);
    expect(error.kind).toBe("failure");
    expect(sdk.embedContent).toHaveBeenCalledTimes(1);
  });
});

describe("geminiLanguageModel", () => {
  it("sends the system text and the prompt, and returns text and token count", async () => {
    sdk.generateContent.mockResolvedValue({
      text: "Submit the form [1].",
      usageMetadata: { totalTokenCount: 321 },
    });

    const answer = await geminiLanguageModel.generate({ system: SYSTEM, prompt: QUESTION });

    expect(answer).toEqual({ text: "Submit the form [1].", tokens: 321 });
    expect(sdk.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-3.5-flash-lite",
        contents: QUESTION,
        config: expect.objectContaining({ systemInstruction: SYSTEM }),
      }),
    );
  });

  it("throws ProviderError('timeout') after one retry when the provider hangs", async () => {
    vi.useFakeTimers();
    sdk.generateContent.mockReturnValue(new Promise(() => {}));

    const result = geminiLanguageModel.generate({ system: SYSTEM, prompt: QUESTION });
    const assertion = expect(result).rejects.toMatchObject({ kind: "timeout" });
    await vi.advanceTimersByTimeAsync(GEMINI_TIMEOUT_MS * GEMINI_ATTEMPTS);
    await assertion;

    expect(sdk.generateContent).toHaveBeenCalledTimes(GEMINI_ATTEMPTS);
  });

  it("throws ProviderError('failure') after one retry and logs no prompt, question or key", async () => {
    sdk.generateContent.mockRejectedValue(
      Object.assign(new Error(`bad request for ${QUESTION} with ${FAKE_KEY}`), { status: 500 }),
    );

    const error = await geminiLanguageModel
      .generate({ system: SYSTEM, prompt: QUESTION })
      .catch((caught) => caught);

    expect(error).toBeInstanceOf(ProviderError);
    expect(error.kind).toBe("failure");
    expect(error.message).not.toContain(QUESTION);
    expect(sdk.generateContent).toHaveBeenCalledTimes(GEMINI_ATTEMPTS);
    const output = logged();
    expect(output).toContain("gemini call failed");
    for (const secret of [QUESTION, SYSTEM, FAKE_KEY]) expect(output).not.toContain(secret);
  });
});

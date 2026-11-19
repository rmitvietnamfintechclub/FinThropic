import { APICallError } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_ATTEMPTS, AI_TIMEOUT_MS, EMBEDDING_DIMENSIONS } from "../constants/gateway.constants";
import { ProviderError } from "../errors";
import { embeddingModelInfo, gatewayEmbedder, gatewayLanguageModel } from "./gateway";

// The Google provider is replaced by the AI SDK's mock models, so the real registry, embedMany and generateText run
// with no network and no real key.
const provider = vi.hoisted(() => ({
  doEmbed: vi.fn(),
  doGenerate: vi.fn(),
  settings: [] as unknown[],
  embeddingModelIds: [] as string[],
  languageModelIds: [] as string[],
}));

vi.mock("@ai-sdk/google", async () => {
  const { MockEmbeddingModelV4, MockLanguageModelV4 } = await import("ai/test");
  return {
    createGoogle: (settings: unknown) => {
      provider.settings.push(settings);
      return {
        specificationVersion: "v4",
        embeddingModel: (modelId: string) => {
          provider.embeddingModelIds.push(modelId);
          return new MockEmbeddingModelV4({
            modelId,
            maxEmbeddingsPerCall: 100,
            doEmbed: provider.doEmbed,
          });
        },
        languageModel: (modelId: string) => {
          provider.languageModelIds.push(modelId);
          return new MockLanguageModelV4({ modelId, doGenerate: provider.doGenerate });
        },
      };
    },
  };
});

const FAKE_KEY = "fake-gemini-key-for-tests";
vi.mock("@/server/config/env", () => ({
  getEnv: () => ({
    GEMINI_API_KEY: FAKE_KEY,
    AI_EMBEDDING_MODEL: "google:gemini-embedding-001",
    AI_CHAT_MODEL: "google:gemini-3.5-flash-lite",
  }),
}));

const QUESTION = "What is the budget request process?";
const SYSTEM = "Answer only from the club documents.";

/** A raw vector of the right size whose length is not 1, as gemini-embedding-001 returns when truncated. */
function rawVector(seed: number): number[] {
  return Array.from({ length: EMBEDDING_DIMENSIONS }, (_, index) => ((index % 13) + seed) / 10);
}

function embedResult(...vectors: number[][]) {
  return { embeddings: vectors, warnings: [] };
}

function generateResult(text: string, totalTokens: number) {
  return {
    content: [{ type: "text", text }],
    finishReason: { unified: "stop", raw: "STOP" },
    usage: {
      inputTokens: {
        total: totalTokens - 1,
        noCache: undefined,
        cacheRead: undefined,
        cacheWrite: undefined,
      },
      outputTokens: { total: 1, text: 1, reasoning: undefined },
    },
    warnings: [],
  };
}

function apiError(statusCode: number) {
  return new APICallError({
    message: `provider said no to ${QUESTION} with ${FAKE_KEY}`,
    url: "https://provider.test",
    requestBodyValues: { prompt: QUESTION },
    statusCode,
  });
}

let logSpies: { mock: { calls: unknown[][] } }[] = [];
function logged(): string {
  return logSpies.flatMap((spy) => spy.mock.calls.flat()).join("\n");
}

beforeEach(() => {
  provider.doEmbed.mockReset();
  provider.doGenerate.mockReset();
  logSpies = (["log", "warn", "error"] as const).map((method) =>
    vi.spyOn(console, method).mockImplementation(() => {}),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("gateway registry", () => {
  it("resolves the provider:model strings from the environment and passes the key", async () => {
    provider.doEmbed.mockResolvedValue(embedResult(rawVector(1)));
    provider.doGenerate.mockResolvedValue(generateResult("ok", 2));

    await gatewayEmbedder.embed([QUESTION], "query");
    await gatewayLanguageModel.generate({ system: SYSTEM, prompt: QUESTION });

    expect(provider.embeddingModelIds).toContain("gemini-embedding-001");
    expect(provider.languageModelIds).toContain("gemini-3.5-flash-lite");
    expect(provider.settings).toContainEqual(expect.objectContaining({ apiKey: FAKE_KEY }));
  });

  it("exposes the embedding model id and size for the eval cache", () => {
    expect(embeddingModelInfo()).toEqual({
      model: "google:gemini-embedding-001",
      dimensions: EMBEDDING_DIMENSIONS,
    });
  });
});

describe("gatewayEmbedder", () => {
  it("returns one unit-length vector of 1,536 numbers per text", async () => {
    provider.doEmbed.mockResolvedValue(embedResult(rawVector(1), rawVector(2)));

    const vectors = await gatewayEmbedder.embed(["first chunk", "second chunk"], "document");

    expect(vectors).toHaveLength(2);
    for (const vector of vectors) {
      expect(vector).toHaveLength(EMBEDDING_DIMENSIONS);
      expect(Math.hypot(...vector)).toBeCloseTo(1, 10);
    }
  });

  it.each([
    ["query", "RETRIEVAL_QUERY"],
    ["document", "RETRIEVAL_DOCUMENT"],
  ] as const)("sends task type %s as %s with 1,536 dimensions", async (task, taskType) => {
    provider.doEmbed.mockResolvedValue(embedResult(rawVector(1)));

    await gatewayEmbedder.embed([QUESTION], task);

    expect(provider.doEmbed).toHaveBeenCalledWith(
      expect.objectContaining({
        values: [QUESTION],
        dimensions: EMBEDDING_DIMENSIONS,
        providerOptions: { google: { taskType } },
      }),
    );
  });

  it("makes no call for an empty list", async () => {
    expect(await gatewayEmbedder.embed([], "query")).toEqual([]);
    expect(provider.doEmbed).not.toHaveBeenCalled();
  });

  it("throws ProviderError('timeout') after one retry when the provider hangs", async () => {
    vi.useFakeTimers();
    provider.doEmbed.mockReturnValue(new Promise(() => {}));

    const result = gatewayEmbedder.embed([QUESTION], "query");
    const assertion = expect(result).rejects.toMatchObject({
      name: "ProviderError",
      kind: "timeout",
    });
    await vi.advanceTimersByTimeAsync(AI_TIMEOUT_MS * AI_ATTEMPTS);
    await assertion;

    expect(provider.doEmbed).toHaveBeenCalledTimes(AI_ATTEMPTS);
    const signals = provider.doEmbed.mock.calls.map(([options]) => options.abortSignal);
    expect(signals.every((signal: AbortSignal) => signal.aborted)).toBe(true);
  });

  it("succeeds when the retry succeeds", async () => {
    provider.doEmbed
      .mockRejectedValueOnce(apiError(503))
      .mockResolvedValueOnce(embedResult(rawVector(3)));

    const vectors = await gatewayEmbedder.embed([QUESTION], "query");

    expect(vectors).toHaveLength(1);
    expect(provider.doEmbed).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["a vector of the wrong size", embedResult([0.1, 0.2])],
    ["the wrong number of vectors", embedResult(rawVector(1), rawVector(2))],
  ])("throws ProviderError('failure') without a retry for %s", async (_, response) => {
    provider.doEmbed.mockResolvedValue(response);

    const error = await gatewayEmbedder.embed([QUESTION], "query").catch((caught) => caught);

    expect(error).toBeInstanceOf(ProviderError);
    expect(error.kind).toBe("failure");
    expect(provider.doEmbed).toHaveBeenCalledTimes(1);
  });
});

describe("gatewayLanguageModel", () => {
  it("sends the system text and the prompt, and returns text and token count", async () => {
    provider.doGenerate.mockResolvedValue(generateResult("Submit the form [1].", 321));

    const answer = await gatewayLanguageModel.generate({ system: SYSTEM, prompt: QUESTION });

    expect(answer).toEqual({ text: "Submit the form [1].", tokens: 321 });
    const [options] = provider.doGenerate.mock.calls[0];
    expect(options.prompt).toEqual([
      { role: "system", content: SYSTEM },
      { role: "user", content: [{ type: "text", text: QUESTION }] },
    ]);
  });

  it("throws ProviderError('timeout') after one retry when the provider hangs", async () => {
    vi.useFakeTimers();
    provider.doGenerate.mockReturnValue(new Promise(() => {}));

    const result = gatewayLanguageModel.generate({ system: SYSTEM, prompt: QUESTION });
    const assertion = expect(result).rejects.toMatchObject({ kind: "timeout" });
    await vi.advanceTimersByTimeAsync(AI_TIMEOUT_MS * AI_ATTEMPTS);
    await assertion;

    expect(provider.doGenerate).toHaveBeenCalledTimes(AI_ATTEMPTS);
  });

  it("does not retry an error the provider marks as not retryable", async () => {
    provider.doGenerate.mockRejectedValue(apiError(400));

    const error = await gatewayLanguageModel
      .generate({ system: SYSTEM, prompt: QUESTION })
      .catch((caught) => caught);

    expect(error).toMatchObject({ name: "ProviderError", kind: "failure" });
    expect(provider.doGenerate).toHaveBeenCalledTimes(1);
  });

  it("throws ProviderError('failure') after one retry and logs no prompt, question or key", async () => {
    provider.doGenerate.mockRejectedValue(apiError(500));

    const error = await gatewayLanguageModel
      .generate({ system: SYSTEM, prompt: QUESTION })
      .catch((caught) => caught);

    expect(error).toBeInstanceOf(ProviderError);
    expect(error.kind).toBe("failure");
    expect(provider.doGenerate).toHaveBeenCalledTimes(AI_ATTEMPTS);
    for (const secret of [QUESTION, SYSTEM, FAKE_KEY]) expect(error.message).not.toContain(secret);
    const output = logged();
    expect(output).toContain("ai call failed");
    expect(output).toContain('"status":500');
    for (const secret of [QUESTION, SYSTEM, FAKE_KEY]) expect(output).not.toContain(secret);
  });
});

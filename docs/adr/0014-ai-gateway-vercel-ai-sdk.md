# 0014 The AI gateway runs on the Vercel AI SDK

Status: accepted
Date: 2026-11-19 Decided by: AI/RAG 1 (VoMinhKhoii)

## Context

PBI-004 needs embeddings and answers from Gemini behind the `Embedder` and `LanguageModel` ports. PBI-020 and PBI-027
pick the final models by measurement, and they may pick a model from another provider. Calling `@google/genai` directly
means a new adapter, new tests and new error handling for every provider we try. We want what LiteLLM gives Python: one
call shape, and a model named by a `provider:model` string.

## Options

- Vercel AI SDK (`ai` plus `@ai-sdk/<provider>`): the TypeScript counterpart of LiteLLM. One `embedMany` and one
  `generateText` for every provider, `createProviderRegistry` for `provider:model` names, typed errors with a
  retryable flag. Cost: two packages, and each provider is its own package.
- A registry we write ourselves over each vendor SDK: no new dependency, but every provider brings its own request
  shape, errors and retry rules, and we test all of it.
- A LiteLLM proxy in front of every provider: one OpenAI-style API for both the web app and the Python worker. Cost: a
  service to deploy, secure and pay for, and one more hop on every question.

## Decision

The Vercel AI SDK. `web/src/server/ai/adapters/gateway.ts` holds the registry and is the only file that may import `ai`
or `@ai-sdk/*` (`provider-sdk-only-in-adapters`). Models come from `AI_EMBEDDING_MODEL` and `AI_CHAT_MODEL`, checked
at start-up against the registered providers. Adding a provider is one package, one name in `AI_PROVIDERS` and one entry in the
`PROVIDERS` map (how to build it and its embedding options). The gateway keeps its own per-attempt timeout and one retry
(`maxRetries: 0` in the SDK) because the SDK never retries a hang. The Python worker can use LiteLLM with the same
`provider:model` names later; that is not part of this decision.

## Consequences

Trying another model is an environment change. Changing `AI_EMBEDDING_MODEL` means re-indexing every chunk: vectors
from two models do not compare, and the model name is stored with each chunk so a mix can be found. The vector size
stays 768 (the database column), so a new embedding model must support that size. Check later: whether the SDK's
`timeout` option can replace our own deadline, and whether the worker should share model names through LiteLLM.

The owner chose 768 on 19 Nov 2026 over the 1,536 in issue #65. Re-measure it with the retrieval smoke eval (PR #218)
once club documents are indexed; changing it later means re-indexing every chunk.

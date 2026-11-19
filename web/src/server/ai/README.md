# server/ai: the AI gateway

`ports.ts` has the interfaces (Embedder, LanguageModel, Reranker). `adapters/` has the gateway (`gateway.ts`) and test
fakes (`fake.ts`). The answering pipeline in `../modules/chat/rag/` depends on ports only.

The gateway runs on the Vercel AI SDK (ADR 0014). A model is a `provider:model` string from the environment:
`AI_EMBEDDING_MODEL` (default `google:gemini-embedding-001`) and `AI_CHAT_MODEL` (default `google:gemini-3.5-flash-lite`).
`env.ts` rejects a provider the gateway does not register. To add a provider: install `@ai-sdk/<name>`, add its name to
`AI_PROVIDERS` in `constants/gateway.constants.ts`, then add its registry line and its embedding options in `gateway.ts`
(the type checker asks for both). Changing `AI_EMBEDDING_MODEL` means re-indexing every chunk.

`errors.ts` has `ProviderError` (kind `timeout` or `failure`): the gateway throws it once its timeout and one retry are
used up. `embeddingModelInfo()` returns the embedding model id and vector size, for the eval cache and the chunk rows.

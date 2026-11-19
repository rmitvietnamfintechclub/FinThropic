# server/ai: the AI gateway

`ports.ts` has the interfaces (Embedder, LanguageModel, Reranker). `adapters/` has the provider code
(`gemini.ts`) and test fakes (`fake.ts`). The answering pipeline in `../modules/chat/rag/` depends on ports only.
A new provider means a new adapter, not edits to the pipeline.

`errors.ts` has `ProviderError` (kind `timeout` or `failure`): an adapter throws it once its timeout and one retry
are used up. The Gemini model names live in `constants/gemini.constants.ts`, the one place to change them.

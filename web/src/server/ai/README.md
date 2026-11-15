# server/ai: the AI gateway

`ports.ts` has the interfaces (Embedder, LanguageModel, Reranker). `adapters/` has the provider code
(`gemini.ts`) and test fakes (`fake.ts`). The answering pipeline in `../modules/chat/rag/` depends on ports only.
A new provider means a new adapter, not edits to the pipeline.

# chat/rag: the answering pipeline

One file per step in `steps/`, run in order by `pipeline.ts`. Each step takes a `RagContext` and returns it with
its own fields added. One owner per step; swap one step, test it alone, compare on the eval set.

| Step            | Job                                          | Owner                    |
| --------------- | -------------------------------------------- | ------------------------ |
| session         | who is asking                                | AI/RAG 1                 |
| rewriteFollowUp | standalone question from the history (Must)  | AI/RAG 1                 |
| embedQuestion   | question to a vector                         | AI/RAG 1                 |
| search          | vector and keyword, access filter in the SQL | AI/RAG 1                 |
| mergeRrf        | merge by rank                                | AI/RAG 1                 |
| rerank          | optional re-score                            | AI/RAG 1                 |
| threshold       | refuse when nothing is relevant              | AI/RAG 1                 |
| generate        | answer only from the chunks                  | AI/RAG 1                 |
| checkCitations  | every [n] points to a retrieved chunk        | AI/RAG 1                 |
| stream          | send word by word                            | Frontend 1 with AI/RAG 1 |

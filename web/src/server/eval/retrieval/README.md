# Retrieval smoke eval

For each question, does the right page come back in the top chunks? This script answers that before the full evaluation exists. It needs no language model, no database and no EBMB approval. It embeds through the `Embedder` port, ranks every chunk by cosine in memory, and reports:

- Recall@1, Recall@5 and MRR over the answerable questions. A hit is a chunk on the gold document and page.
- The top-1 similarity of every question, split into answerable and no-answer: min, median and max per group, the cutoff that misclassifies the fewest questions, and how many it gets wrong (input for `RELEVANCE_THRESHOLD`, #67).

This is the retrieval-only first slice of PBI-013; #100 to #102 will grow it into the runner for the full tuning set. The code lives in `web/src/server/eval/` rather than the root `eval/` folder so lint, typecheck, `arch` and the tests cover it. The question sets of PBI-012 still go in `eval/`.

## Never commit club data

Real chunks, real questions, the embedding cache and the results stay in `fixtures/private/`, which git ignores (`SECURITY.md`). By default the cache and the results file are written to `fixtures/private/eval/`. Only the synthetic `example/` files are committed. The 20 hold-out questions are never used or stored here.

## Run it

From `web/`:

```sh
bun run eval:retrieval \
  --chunks ../fixtures/private/eval/chunks.jsonl \
  --questions ../fixtures/private/eval/questions.jsonl \
  --embedder gateway
```

| Flag          | Default                                                    | Meaning                                                                                                |
| ------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `--chunks`    | required                                                   | chunks JSONL                                                                                           |
| `--questions` | required                                                   | questions JSONL                                                                                        |
| `--embedder`  | `fake`                                                     | `fake` (word-hash vectors, no network) or `gateway` (the AI gateway's model from `AI_EMBEDDING_MODEL`) |
| `--out`       | `../fixtures/private/eval/results/retrieval-<commit>.json` | results JSON, with the full commit id and whether there were local changes                             |
| `--cache`     | `../fixtures/private/eval/embedding-cache.json`            | vectors keyed by model, task and a SHA-256 of the text, so a rerun spends no quota                     |
| `--no-cache`  | off                                                        | embed everything again and write no cache                                                              |

Try it on the synthetic example:

```sh
bun run eval:retrieval --chunks src/server/eval/retrieval/example/chunks.jsonl --questions src/server/eval/retrieval/example/questions.jsonl
```

The script is `bun --conditions=react-server src/server/eval/retrieval/run.ts`. Every file under `src/server/` starts with `import "server-only"`, which throws in a plain bun or node process; the `react-server` condition makes that package resolve to its empty build, as it does inside Next.js. The report goes to stdout with `process.stdout.write`, not through `logger`: it is a terminal table for the person running the script, and it holds ids and numbers only, never question or chunk text. With `gateway`, Bun loads `web/.env.local` like the app does, and the run stops with the name of any missing variable, such as `GEMINI_API_KEY`. The cache label is the model and vector size from `embeddingModelInfo()`, for example `google:gemini-embedding-001@768`, so a model change never reuses old vectors.

## Input formats

One JSON object per line. Blank lines are skipped. Extra fields on a row are ignored, so a question set may also carry its language or expected answer, but `gold` takes only `documentName` and `page`. Every problem is reported with its file, line and field, and nothing runs until the files are valid.

Chunks:

```json
{ "chunkId": "handbook-p2-0", "documentName": "handbook.pdf", "page": 2, "text": "Members pay ..." }
```

Questions (`gold` is `null` for a question the documents cannot answer):

```json
{"id":"q-01","question":"How much is the membership fee?","gold":{"documentName":"handbook.pdf","page":2}}
{"id":"q-11","question":"Who won the 2018 World Cup?","gold":null}
```

`chunkId` and `id` must be unique, and every gold page must have at least one chunk, so a typo in a gold label stops the run.

## Make the chunks file from the ingest chunker

Once PR #208 (parse and chunk) is merged, run this from `ingest/` with its virtual environment. It reads the PDFs in `fixtures/private/docs/` and writes one chunk per line:

```sh
python - <<'PY'
import json, pathlib
from steps.chunk import chunk
from steps.parse import parse

docs = pathlib.Path("../fixtures/private/docs")
out = pathlib.Path("../fixtures/private/eval/chunks.jsonl")
out.parent.mkdir(parents=True, exist_ok=True)
with out.open("w", encoding="utf-8") as f:
    for pdf in sorted(docs.glob("*.pdf")):
        for c in chunk(pdf.name, parse(str(pdf))):
            row = {"chunkId": f"{pdf.name}#{c.position}", "documentName": pdf.name, "page": c.page, "text": c.text}
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
PY
```

To compare chunking methods (#61, #79), write one chunks file per method and run the same questions against each. The gold labels name a page, not a chunk, so they stay valid when the chunking changes.

The default results file is named after the commit only (#100), so a second run on the same commit overwrites the first. Give each chunking method or embedder its own `--out`:

```sh
bun run eval:retrieval --chunks ../fixtures/private/eval/chunks-by-page.jsonl \
  --questions ../fixtures/private/eval/questions.jsonl --embedder gateway \
  --out ../fixtures/private/eval/results/retrieval-by-page-gateway.json
```

## Write the questions

- Put each question in `fixtures/private/eval/questions.jsonl`, with the document file name and the real PDF page (counted from 1, not the number printed on the slide).
- Mix in no-answer questions with `"gold": null`. #67 asks for about 10 answerable and 10 no-answer ones to set the threshold.
- Do not reuse the hold-out questions, and do not paste document text into a question.

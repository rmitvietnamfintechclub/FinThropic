# 0013 PDF reader

Status: accepted
Date: 2026-11-18   Decided by: Gia Phat

## Context
The indexing worker must read an approved PDF page by page, keep the position in the file (AC4),
count the pictures on each page (the input for the `page N: picture, little text` warning in #63),
and later render a flagged page for the vision model. Nothing in the repository reads PDFs today,
so choosing a reader adds a dependency and a new pattern, which needs an ADR.

## Options
1. pypdf — BSD, pure Python, no native build; no page rendering, and counting images means reading
   each page's `/XObject` resources by hand.
2. pdfplumber — MIT, good text geometry and tables; counting images is still manual, and it cannot
   render a page to PNG.
3. PyMuPDF — best text extraction and a direct `page.get_images()` API, and it can render a page to
   PNG for the #60 vision open point; licensed **AGPL-3.0**, not permissive.

## Decision
Option 3: PyMuPDF, pinned `pymupdf>=1.28,<2` in `ingest/requirements.txt` and imported as
`pymupdf`. The reader is confined to `steps/parse.py` behind `read_raw_pages`, so no other step
imports the library. It is the only option that gives both the image count and the page rendering
#60 needs, and the licence cost is acceptable while the worker stays a batch job in a private
repository.

The 1.x line is pinned deliberately. The wheel metadata of `pymupdf` 2.1 declares runtime
requirements on `numpy`, `onnxruntime`, `pymupdf-layout`, `pymupdf4llm`, `networkx`, `psutil` and
`tabulate`, so a text reader would drag an ML layout stack into the worker and into CI. `pymupdf`
1.28.2 declares no runtime dependencies and lifts no API this code uses: the parse and chunk suite,
`ruff` and `mypy --strict` pass unchanged on it.

## Consequences
- AGPL-3.0 obligations apply if the worker is ever distributed or exposed over a network. Revisit
  if the repository becomes public or the worker becomes a served component.
- 2.x is excluded on purpose. Revisit when a 2.x release declares no runtime dependencies, or when
  the worker genuinely needs layout analysis (structure-based chunking in PBI-008 may).
- Footer removal is line-based and heuristic: a line repeated on more than half the pages and at most
  12 words long is treated as a footer. A paragraph repeated across most pages is extracted as
  several wrapped lines, so a repeated short remnant of it can be dropped too. Position-based
  detection (the bounding boxes from `page.get_text("dict")` in the top and bottom bands) is the
  follow-up if a club document is ever affected.
- Everything downstream depends only on the `Page` dataclass, so swapping the reader later touches
  one function (`read_raw_pages`).
- PyMuPDF's stubs leave several callables untyped: each untyped call carries one
  `# type: ignore[no-untyped-call]` under mypy strict. `Document` is not iterable in the stubs, so
  pages are loaded by index with `doc.load_page(index)`.

# 0015 PDF reader

Status: accepted
Date: 2026-11-21   Decided by: Gia Phat

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
Option 3: PyMuPDF, pinned `pymupdf>=1.28.2,<2` in `ingest/requirements.txt` and imported as
`pymupdf`. The reader is confined to `steps/parse.py` behind `read_raw_pages`, so no other step
imports the library. It is the only option that gives both the image count and the page rendering
#60 needs.

**Below 2, for the wheels.** PyPI publishes 2.0 and 2.1 for `macosx_11_0_arm64` only (plus an
sdist), so an Intel Mac has no wheel and falls back to a source build that needs the MuPDF
toolchain. 1.28.2 publishes both `macosx_10_15_x86_64` and `macosx_11_0_arm64`, and it declares no
runtime dependencies. The club has mixed laptops, so the worker has to install everywhere. The
same suite, `ruff` and `mypy --strict` pass on 1.28.2 with the same type-ignore list. Reconsider
2.x in PBI-008, when the layout engine (`pymupdf-layout` / `pymupdf4llm`) is actually used, on
machines that can install it.

## Consequences
- AGPL-3.0 obligations apply if the worker is ever distributed or exposed over a network. The
  repository is public now, so the licence verdict is an open decision, **not decided by us**: it
  is pending from KhanhQNguyn with Khoa. It blocks merge and may change the library.
- Footer removal is line-based and heuristic: a line repeated on more than half the pages and at
  most 12 words long is treated as a footer. A paragraph repeated across most pages is extracted
  as several wrapped lines, so a repeated short remnant of it can be dropped too. Position-based
  detection (the bounding boxes from `page.get_text("dict")` in the top and bottom bands) is the
  follow-up if a club document is ever affected.
- A bare number is treated as a page number only when it is the first or last non-empty line of
  the page and equals the page position or the deck's shared printed gap (the difference most
  pages share between the printed number and the page position). Numbers inside the body, such as
  table cells, stay.
- Everything downstream depends only on the `Page` dataclass, so swapping the reader later touches
  one function (`read_raw_pages`).
- PyMuPDF's stubs leave several callables untyped: each untyped call carries one
  `# type: ignore[no-untyped-call]` under mypy strict. `Document` is not iterable in the stubs, so
  pages are loaded by index with `doc.load_page(index)`.

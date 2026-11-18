"""Read the PDF page by page. Keep the real page number and count the pictures on each page.

Two passes: the first reads every line and counts on how many pages it appears, the second drops
the lines that only decorate the deck (running footers and bare page numbers) and builds the pages.
`number` is always the position in the file, never the number printed on the slide.
"""

from __future__ import annotations

import re
import unicodedata
from collections import Counter

import pymupdf

from config import MAX_REPEATED_LINE_WORDS, MIN_PAGES_FOR_REPEAT_RULE
from models.chunk import Context, Page

BARE_NUMBER = re.compile(
    r"^\s*(?:page\s*)?[-\u2013\u2014/ ]*\d{1,4}\s*(?:/\s*\d{1,4})?\s*$",
    re.IGNORECASE,
)


class NoReadableTextError(Exception):
    """The PDF has no text layer at all: scanned images only."""


class PdfParseError(Exception):
    """The file cannot be read as a PDF, or it is encrypted."""


def _norm(line: str) -> str:
    """Fold a line so the same footer compares equal on every page."""
    return " ".join(unicodedata.normalize("NFKC", line).casefold().split())


def read_raw_pages(path: str) -> list[tuple[int, list[str], int]]:
    """The only place that touches PyMuPDF: one type ignore per untyped call."""
    try:
        doc = pymupdf.open(path)  # type: ignore[no-untyped-call]
    except Exception as exc:  # noqa: BLE001 - every pymupdf failure is a parse failure
        raise PdfParseError(f"cannot read pdf: {exc}") from exc
    raw: list[tuple[int, list[str], int]] = []
    with doc:
        if doc.needs_pass:
            raise PdfParseError("encrypted pdf")
        for index in range(doc.page_count):
            page = doc.load_page(index)  # type: ignore[no-untyped-call]
            raw.append(
                (
                    index + 1,
                    page.get_text("text").splitlines(),
                    len(page.get_images(full=True)),
                )
            )
    return raw


def parse(path: str) -> list[Page]:
    """Turn the file into pages, dropping running footers and bare page numbers."""
    raw = read_raw_pages(path)

    total = len(raw)
    seen: Counter[str] = Counter()
    for _, lines, _ in raw:
        for key in {_norm(line) for line in lines if line.strip()}:
            seen[key] += 1
    repeated = {
        key
        for key, count in seen.items()
        if total >= MIN_PAGES_FOR_REPEAT_RULE
        and count > total / 2
        and len(key.split()) <= MAX_REPEATED_LINE_WORDS
    }

    pages: list[Page] = []
    for number, lines, images in raw:
        kept = [
            line
            for line in lines
            if line.strip() and _norm(line) not in repeated and not BARE_NUMBER.match(line)
        ]
        pages.append(Page(number=number, text="\n".join(kept).strip(), image_count=images))

    if not any(page.text.strip() for page in pages):
        raise NoReadableTextError("no readable text")
    return pages


class ParseStep:
    name = "parse"

    def run(self, ctx: Context) -> Context:
        ctx.pages = parse(ctx.path)
        return ctx

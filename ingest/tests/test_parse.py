"""Tests for issue #60: a PDF becomes pages with real numbers and image counts."""

from __future__ import annotations

from pathlib import Path

import pytest

from models.chunk import Context
from steps.parse import NoReadableTextError, ParseStep, PdfParseError, parse
from tests.pdf_factory import (
    corrupt_pdf,
    footer_pdf,
    image_only_pdf,
    mixed_pdf,
    partly_repeated_pdf,
    printed_number_pdf,
    single_printed_number_pdf,
    table_pdf,
    text_pdf,
    year_once_pdf,
)


def test_five_page_pdf_numbered_one_to_five(tmp_path: Path) -> None:
    pages = parse(text_pdf(str(tmp_path / "five.pdf")))
    assert [p.number for p in pages] == [1, 2, 3, 4, 5]
    assert all(f"PAGE-{p.number}" in p.text for p in pages)
    assert all(p.image_count == 0 for p in pages)


def test_repeated_footer_removed(tmp_path: Path) -> None:
    pages = parse(footer_pdf(str(tmp_path / "footer.pdf")))
    assert all("Confidential" not in p.text for p in pages)
    assert all(f"PAGE-{p.number}" in p.text for p in pages)


def test_bare_page_numbers_removed(tmp_path: Path) -> None:
    pages = parse(footer_pdf(str(tmp_path / "numbers.pdf")))
    assert all(line.strip() != str(p.number) for p in pages for line in p.text.splitlines())


def test_table_numbers_are_not_page_numbers(tmp_path: Path) -> None:
    pages = parse(table_pdf(str(tmp_path / "table.pdf")))
    lines = [line for page in pages for line in page.text.splitlines()]
    assert all(number in lines for number in ("1500", "120", "2026"))


def test_bare_year_on_one_page_is_kept(tmp_path: Path) -> None:
    pages = parse(year_once_pdf(str(tmp_path / "year.pdf")))
    assert pages[1].text.splitlines()[-1] == "2026"


def test_printed_slide_numbers_without_a_majority_stay(tmp_path: Path) -> None:
    pages = parse(single_printed_number_pdf(str(tmp_path / "single.pdf")))
    assert pages[2].text.splitlines()[-1] == "75"


def test_scanned_pdf_raises_no_readable_text(tmp_path: Path) -> None:
    with pytest.raises(NoReadableTextError, match="no readable text"):
        parse(image_only_pdf(str(tmp_path / "scan.pdf")))


def test_page_with_image_reports_image_count(tmp_path: Path) -> None:
    pages = parse(mixed_pdf(str(tmp_path / "mixed.pdf")))
    assert pages[0].image_count == 1


def test_citation_uses_the_real_page_index(tmp_path: Path) -> None:
    pages = parse(printed_number_pdf(str(tmp_path / "printed.pdf")))
    assert [p.number for p in pages] == [1, 2, 3]
    assert pages[2].text.splitlines()[0] == "Printed slide 75"
    assert not any(line.strip() == "75" for line in pages[2].text.splitlines())


def test_line_on_two_of_six_pages_survives(tmp_path: Path) -> None:
    pages = parse(partly_repeated_pdf(str(tmp_path / "partly.pdf")))
    assert sum("Agenda item carried over." in p.text for p in pages) == 2


def test_corrupt_file_raises_parse_error(tmp_path: Path) -> None:
    with pytest.raises(PdfParseError, match="cannot read pdf"):
        parse(corrupt_pdf(str(tmp_path / "corrupt.pdf")))


def test_step_sets_pages_on_the_context(tmp_path: Path) -> None:
    ctx = Context(document_id="doc-1", path=text_pdf(str(tmp_path / "context.pdf")))
    out = ParseStep().run(ctx)
    assert out.pages
    assert out.chunks == []

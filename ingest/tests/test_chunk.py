"""Tests for issue #61: page text becomes chunks that keep document, page and position."""

from __future__ import annotations

from pathlib import Path

from config import CHUNK_TARGET_TOKENS
from models.chunk import Context, Page
from steps.chunk import ChunkStep, chunk, estimate_tokens
from steps.parse import parse
from tests.chunk_questions import QUESTIONS
from tests.pdf_factory import near_empty_pdf, text_pdf


def test_one_chunk_per_page_and_positions_increase(tmp_path: Path) -> None:
    chunks = chunk("doc-1", parse(text_pdf(str(tmp_path / "five.pdf"))))
    assert [c.page for c in chunks] == [1, 2, 3, 4, 5]
    assert [c.position for c in chunks] == [0, 1, 2, 3, 4]


def test_no_word_lost_or_duplicated(tmp_path: Path) -> None:
    pages = parse(text_pdf(str(tmp_path / "words.pdf")))
    chunks = chunk("doc-1", pages)
    for page in pages:
        words = [word for c in chunks if c.page == page.number for word in c.text.split()]
        assert words == page.text.split()


def test_chunk_text_stays_inside_its_page(tmp_path: Path) -> None:
    pages = parse(text_pdf(str(tmp_path / "inside.pdf")))
    chunks = chunk("doc-1", pages)
    by_number = {page.number: page.text for page in pages}
    assert all(c.text in by_number[c.page] for c in chunks)


def test_document_id_propagates(tmp_path: Path) -> None:
    chunks = chunk("doc-42", parse(text_pdf(str(tmp_path / "id.pdf"))))
    assert all(c.document_id == "doc-42" for c in chunks)


def test_long_page_splits_under_budget() -> None:
    lines = [f"Sentence {index} about budget rules." for index in range(80)]
    pages = [Page(number=1, text="Long slide\n" + "\n".join(lines))]
    chunks = chunk("doc-1", pages)
    assert len(chunks) > 1
    assert all(estimate_tokens(c.text) <= CHUNK_TARGET_TOKENS for c in chunks)
    assert chunks[0].text.startswith("Long slide")
    assert len(chunks[0].text.splitlines()) > 1
    assert all(c.page == 1 for c in chunks)


def test_dense_single_paragraph_loses_no_words() -> None:
    sentences = " ".join(f"Sentence {index} about the budget." for index in range(300))
    pages = [Page(number=1, text=sentences)]
    chunks = chunk("doc-1", pages)
    assert len(chunks) > 1
    assert all(estimate_tokens(c.text) <= CHUNK_TARGET_TOKENS for c in chunks)
    assert len(" ".join(c.text for c in chunks).split()) == len(sentences.split())


def test_short_tail_is_absorbed() -> None:
    pages = [Page(number=1, text="a" * 1998 + "\n\nTotal: 5m")]
    chunks = chunk("doc-1", pages)
    assert len(chunks) == 1
    assert "Total: 5m" in chunks[0].text


def test_absorbed_chunk_is_still_inside_its_page() -> None:
    text = "a" * 1998 + "\n\nTotal: 5m"
    chunks = chunk("doc-1", [Page(number=1, text=text)])
    assert all(c.text in text for c in chunks)


def test_short_leading_piece_is_kept() -> None:
    pages = [Page(number=1, text="Total: 5m\n\n" + "a" * 1998)]
    chunks = chunk("doc-1", pages)
    assert len(chunks) == 2
    assert chunks[0].text == "Total: 5m"


def test_absorption_never_crosses_a_page() -> None:
    pages = [
        Page(number=1, text="a" * 1998 + "\n\nmore text on page one"),
        Page(number=2, text="z" * 10 + "\n\nTotal: 5m"),
    ]
    chunks = chunk("doc-1", pages)
    assert [c.page for c in chunks if "Total: 5m" in c.text] == [2]


def test_near_empty_divider_folds_into_previous_page(tmp_path: Path) -> None:
    chunks = chunk("doc-1", parse(near_empty_pdf(str(tmp_path / "near-empty.pdf"))))
    assert len(chunks) == 1
    assert chunks[0].page == 1
    assert "Thank you" in chunks[0].text


def test_small_but_real_slide_does_not_merge() -> None:
    pages = [
        Page(number=1, text=" ".join(["budget"] * 39)),
        Page(number=2, text=" ".join(["budget"] * 13)),
    ]
    chunks = chunk("doc-1", pages)
    assert [c.page for c in chunks] == [1, 2]


def test_empty_page_produces_no_chunk() -> None:
    pages = [Page(number=1, text="Only slide here."), Page(number=2, text="")]
    chunks = chunk("doc-1", pages)
    assert [c.page for c in chunks] == [1]


def test_step_sets_chunks_on_the_context(tmp_path: Path) -> None:
    ctx = Context(document_id="doc-1", path=text_pdf(str(tmp_path / "context.pdf")))
    ctx.pages = parse(ctx.path)
    out = ChunkStep().run(ctx)
    assert out.chunks
    assert all(c.document_id == "doc-1" for c in out.chunks)


def test_chunk_questions_in_scope() -> None:
    assert len(QUESTIONS) == 10
    assert all(question.strip() for question in QUESTIONS)

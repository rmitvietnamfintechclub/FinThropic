"""Tests for issue #63: warnings, the store step, the runner and the schema contract."""

from __future__ import annotations

import re
from dataclasses import dataclass, fields
from pathlib import Path
from typing import Any

import httpx
import pytest

from ai.embedder import EmbeddingError
from models.chunk import Chunk, Context, Page
from pipeline import default_steps, run
from repositories.documents import (
    FakeDocumentWriter,
    NullDocumentWriter,
    RepositoryError,
    SupabaseDocumentWriter,
)
from steps.chunk import chunk
from steps.parse import NoReadableTextError, parse
from steps.store import StoreStep, page_warnings
from tests.pdf_factory import mixed_pdf

MIGRATIONS = Path(__file__).resolve().parents[2] / "supabase" / "migrations"


def columns_from_migrations(migrations: Path, table: str) -> set[str]:
    """Column names of a table, including columns added by a later migration."""
    text = "\n".join(path.read_text(encoding="utf-8") for path in sorted(migrations.glob("*.sql")))
    match = re.search(
        rf"create table (?:if not exists )?public\.{table} \((?P<body>.*?)\n\);",
        text,
        re.IGNORECASE | re.DOTALL,
    )
    if match is None:
        raise AssertionError(f"table {table} not found in migrations")
    columns: set[str] = set()
    for raw in match.group("body").splitlines():
        line = raw.strip()
        if not line or line.startswith("--"):
            continue
        token = line.split()[0].rstrip(",")
        if token.isidentifier():
            columns.add(token)
    for alter in re.finditer(
        rf"alter table (?:if exists )?public\.{table}\s+add column (?:if not exists )?"
        r"(?P<column>\w+)",
        text,
        re.IGNORECASE,
    ):
        columns.add(alter.group("column"))
    return columns


def _missing_columns(model: type[Any], columns: set[str]) -> list[str]:
    return sorted(field.name for field in fields(model) if field.name not in columns)


def _assert_columns(model: type[Any], columns: set[str]) -> None:
    missing = _missing_columns(model, columns)
    if missing:
        raise AssertionError(f"missing columns for {missing}")


class _Recorder:
    def __init__(self, name: str, log: list[str]) -> None:
        self.name, self._log = name, log

    def run(self, ctx: Context) -> Context:
        self._log.append(self.name)
        return ctx


class _RaisingStep:
    name = "raise"

    def __init__(self, error: Exception) -> None:
        self._error = error

    def run(self, ctx: Context) -> Context:
        raise self._error


def test_page_warnings_names_a_page_with_a_picture_and_little_text() -> None:
    pages = [Page(number=45, text=" ".join(["word"] * 24), image_count=1)]
    assert page_warnings(pages) == ["page 45: picture, little text"]


def test_page_warnings_ignores_a_page_at_the_word_limit() -> None:
    pages = [Page(number=1, text=" ".join(["word"] * 25), image_count=1)]
    assert page_warnings(pages) == []


def test_page_warnings_ignores_a_short_page_without_a_picture() -> None:
    pages = [Page(number=1, text="short", image_count=0)]
    assert page_warnings(pages) == []


def test_store_writes_ready_with_chunks_and_warnings(tmp_path: Path) -> None:
    ctx = Context(document_id="doc-1", path=mixed_pdf(str(tmp_path / "mixed.pdf")))
    ctx.pages = parse(ctx.path)
    ctx.chunks = chunk(ctx.document_id, ctx.pages)
    fake = FakeDocumentWriter()
    StoreStep(fake).run(ctx)
    assert fake.calls == ["save_result"]
    assert fake.saved[0][3] == "ready"
    assert fake.saved[0][2] == ["page 1: picture, little text"]
    assert [item.chunk_index for item in fake.saved[0][1]] == [0]


def test_store_records_failure_when_no_chunk_came_out() -> None:
    ctx = Context(document_id="doc-1", path="x.pdf")
    ctx.pages = [Page(number=1, text="only a title", image_count=0)]
    fake = FakeDocumentWriter()
    StoreStep(fake).run(ctx)
    assert fake.calls == ["mark_failed"]
    assert fake.failures == [("doc-1", "no chunk produced")]


def test_pipeline_marks_processing_then_failed_on_no_readable_text() -> None:
    fake = FakeDocumentWriter()
    ctx = Context(document_id="doc-1", path="x.pdf")
    with pytest.raises(NoReadableTextError, match="no readable text"):
        run(ctx, [_RaisingStep(NoReadableTextError("no readable text"))], writer=fake)
    assert fake.calls == ["mark_processing", "mark_failed"]
    assert fake.failures == [("doc-1", "no readable text")]


def test_pipeline_marks_failed_on_an_embedding_error() -> None:
    fake = FakeDocumentWriter()
    ctx = Context(document_id="doc-1", path="x.pdf")
    with pytest.raises(EmbeddingError, match="provider down"):
        run(ctx, [_RaisingStep(EmbeddingError("provider down"))], writer=fake)
    assert fake.calls == ["mark_processing", "mark_failed"]
    assert fake.failures == [("doc-1", "provider down")]


def test_pipeline_with_a_null_writer_still_runs_recorder_steps() -> None:
    log: list[str] = []
    ctx = Context(document_id="doc-1", path="x.pdf")
    run(ctx, [_Recorder("a", log)], writer=NullDocumentWriter())
    assert log == ["a"]


def test_contract_every_chunk_field_is_a_column() -> None:
    columns = columns_from_migrations(MIGRATIONS, "chunks")
    assert _missing_columns(Chunk, columns) == []


def test_contract_every_document_field_the_writer_uses_is_a_column() -> None:
    columns = columns_from_migrations(MIGRATIONS, "documents")
    assert {"status", "error", "warnings"} <= columns


def test_contract_fails_when_a_field_has_no_column() -> None:
    @dataclass
    class FakeChunk:
        chunk_index: int
        not_a_column: str

    columns = columns_from_migrations(MIGRATIONS, "chunks")
    with pytest.raises(AssertionError, match="not_a_column"):
        _assert_columns(FakeChunk, columns)


def test_the_runner_passes_its_writer_to_the_store_step() -> None:
    fake = FakeDocumentWriter()
    ctx = Context(document_id="d9", path="x.pdf")
    ctx.chunks = [Chunk("d9", 1, 0, "text", [0.1], "google:m", "v1")]
    run(ctx, default_steps(fake)[-1:], writer=fake)
    assert fake.calls == ["mark_processing", "save_result"]


def test_a_non_json_error_page_becomes_a_repository_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://example.test")
    monkeypatch.setenv("SUPABASE_SECRET_KEY", "test-secret")

    def bad_gateway(method: str, url: str, **_: Any) -> httpx.Response:
        return httpx.Response(
            502, text="<html>Bad Gateway</html>", request=httpx.Request(method, url)
        )

    monkeypatch.setattr(httpx, "request", bad_gateway)
    with pytest.raises(RepositoryError, match="502"):
        SupabaseDocumentWriter().mark_processing("d10")

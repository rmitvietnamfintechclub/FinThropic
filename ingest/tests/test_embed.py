"""Tests for issue #62: the Embedder port, the Gemini adapter and the embed step."""

from __future__ import annotations

import math
import os
from typing import Any

import pytest

from ai.embedder import (
    TASK_DOCUMENT,
    TASK_QUERY,
    EmbeddingError,
    FakeEmbedder,
    GeminiEmbedder,
    Transport,
    build_embedder,
)
from config import EMBEDDING_DIMENSIONS, PIPELINE_VERSION
from models.chunk import Chunk, Context
from pipeline import default_steps
from steps.embed import EmbedStep


def _vectors(count: int, dimensions: int, scale: float = 1.0) -> list[list[float]]:
    return [
        [(((index + 1) * (position + 1)) % 97 + 1) * scale for position in range(dimensions)]
        for index in range(count)
    ]


def _transport_returning(vectors: list[list[float]], calls: list[dict[str, Any]]) -> Transport:
    def transport(url: str, payload: dict[str, Any]) -> tuple[int, dict[str, Any]]:
        calls.append(payload)
        body: dict[str, Any] = {"embeddings": [{"values": vector} for vector in vectors]}
        return 200, body

    return transport


def test_one_request_per_batch_of_100() -> None:
    batches: list[int] = []

    def transport(url: str, payload: dict[str, Any]) -> tuple[int, dict[str, Any]]:
        requests = payload["requests"]
        batches.append(len(requests))
        body: dict[str, Any] = {
            "embeddings": [{"values": row} for row in _vectors(len(requests), EMBEDDING_DIMENSIONS)]
        }
        return 200, body

    vectors = GeminiEmbedder(api_key="k", transport=transport).embed(
        [f"text {index}" for index in range(250)], TASK_DOCUMENT
    )
    assert batches == [100, 100, 50]
    assert len(vectors) == 250


def test_payload_sends_task_type_and_dimensions() -> None:
    calls: list[dict[str, Any]] = []
    embedder = GeminiEmbedder(
        api_key="k",
        transport=_transport_returning(_vectors(2, EMBEDDING_DIMENSIONS), calls),
    )
    embedder.embed(["one", "two"], TASK_DOCUMENT)
    requests = calls[0]["requests"]
    assert all(item["taskType"] == TASK_DOCUMENT for item in requests)
    assert all(item["outputDimensionality"] == EMBEDDING_DIMENSIONS for item in requests)
    assert all(item["model"] == "models/gemini-embedding-001" for item in requests)


def test_query_task_type() -> None:
    calls: list[dict[str, Any]] = []
    embedder = GeminiEmbedder(
        api_key="k",
        transport=_transport_returning(_vectors(1, EMBEDDING_DIMENSIONS), calls),
    )
    embedder.embed(["question"], TASK_QUERY)
    assert calls[0]["requests"][0]["taskType"] == TASK_QUERY


def test_vectors_are_768_and_unit_length() -> None:
    calls: list[dict[str, Any]] = []
    embedder = GeminiEmbedder(
        api_key="k",
        transport=_transport_returning(_vectors(2, EMBEDDING_DIMENSIONS, 3.5), calls),
    )
    vectors = embedder.embed(["one", "two"], TASK_DOCUMENT)
    assert all(len(vector) == EMBEDDING_DIMENSIONS for vector in vectors)
    assert all(
        abs(math.sqrt(sum(value * value for value in vector)) - 1.0) < 1e-9 for vector in vectors
    )


def test_retries_a_429_then_succeeds() -> None:
    attempts: list[int] = []
    sleeps: list[float] = []

    def transport(url: str, payload: dict[str, Any]) -> tuple[int, dict[str, Any]]:
        attempts.append(1)
        if len(attempts) < 2:
            return 429, {"error": "rate limited"}
        body: dict[str, Any] = {"embeddings": [{"values": _vectors(1, EMBEDDING_DIMENSIONS)[0]}]}
        return 200, body

    GeminiEmbedder(api_key="k", transport=transport, sleep=sleeps.append).embed(
        ["one"], TASK_DOCUMENT
    )
    assert len(attempts) == 2
    assert sleeps == [2]


def test_gives_up_after_three_attempts() -> None:
    sleeps: list[float] = []

    def transport(url: str, payload: dict[str, Any]) -> tuple[int, dict[str, Any]]:
        return 429, {"error": "rate limited"}

    with pytest.raises(EmbeddingError, match="3 attempts"):
        GeminiEmbedder(api_key="k", transport=transport, sleep=sleeps.append).embed(
            ["one"], TASK_DOCUMENT
        )
    assert sleeps == [2, 4]


def test_a_400_is_not_retried() -> None:
    calls: list[int] = []

    def transport(url: str, payload: dict[str, Any]) -> tuple[int, dict[str, Any]]:
        calls.append(1)
        return 400, {"error": "invalid api key"}

    with pytest.raises(EmbeddingError, match="embedding failed"):
        GeminiEmbedder(api_key="bad", transport=transport).embed(["one"], TASK_DOCUMENT)
    assert len(calls) == 1


def test_wrong_dimension_is_rejected() -> None:
    calls: list[dict[str, Any]] = []
    embedder = GeminiEmbedder(
        api_key="k",
        transport=_transport_returning(_vectors(1, 1536), calls),
    )
    with pytest.raises(EmbeddingError, match="expected 768 dimensions, got 1536"):
        embedder.embed(["one"], TASK_DOCUMENT)


def test_fake_embedder_is_deterministic_and_normalised() -> None:
    fake = FakeEmbedder()
    vectors = fake.embed(["alpha", "beta", "alpha"], TASK_DOCUMENT)
    assert all(len(vector) == EMBEDDING_DIMENSIONS for vector in vectors)
    assert all(
        abs(math.sqrt(sum(value * value for value in vector)) - 1.0) < 1e-9 for vector in vectors
    )
    assert vectors[0] == vectors[2]
    assert vectors[0] != vectors[1]


def test_step_fills_embedding_model_and_pipeline_version() -> None:
    ctx = Context(document_id="doc-1", path="x.pdf")
    ctx.chunks = [
        Chunk(document_id="doc-1", page=1, position=0, text="one"),
        Chunk(document_id="doc-1", page=1, position=1, text="two"),
    ]
    out = EmbedStep(embedder=FakeEmbedder()).run(ctx)
    assert all(len(chunk.embedding or []) == EMBEDDING_DIMENSIONS for chunk in out.chunks)
    assert all(chunk.embedding_model == "fake-embedder" for chunk in out.chunks)
    assert all(chunk.pipeline_version == PIPELINE_VERSION for chunk in out.chunks)


def test_step_without_chunks_needs_no_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    ctx = Context(document_id="doc-1", path="x.pdf")
    out = EmbedStep().run(ctx)
    assert out.chunks == []


def test_step_without_a_key_names_the_variable(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    ctx = Context(document_id="doc-1", path="x.pdf")
    ctx.chunks = [Chunk(document_id="doc-1", page=1, position=0, text="one")]
    with pytest.raises(EmbeddingError, match="GEMINI_API_KEY"):
        EmbedStep().run(ctx)


def test_default_pipeline_still_constructs_without_a_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    assert [step.name for step in default_steps()] == [
        "parse",
        "chunk",
        "enrich",
        "embed",
        "store",
    ]


@pytest.mark.skipif(not os.environ.get("GEMINI_API_KEY"), reason="needs GEMINI_API_KEY")
def test_live_gemini_embedder_returns_unit_vectors() -> None:
    vectors = build_embedder().embed(["budget rules", "travel policy"], TASK_DOCUMENT)
    assert all(len(vector) == EMBEDDING_DIMENSIONS for vector in vectors)
    assert all(
        abs(math.sqrt(sum(value * value for value in vector)) - 1.0) < 1e-9 for vector in vectors
    )
    assert vectors[0] != vectors[1]

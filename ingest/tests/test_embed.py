"""Tests for issue #62: the Embedder port, the Gemini adapter and the embed step."""

from __future__ import annotations

import math
import os
from typing import Any

import httpx
import pytest

from ai.embedder import (
    TASK_DOCUMENT,
    TASK_QUERY,
    EmbeddingError,
    FakeEmbedder,
    GeminiEmbedder,
    TransientTransportError,
    Transport,
    _httpx_transport,
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
    def transport(
        url: str, headers: dict[str, str], payload: dict[str, Any]
    ) -> tuple[int, dict[str, Any]]:
        calls.append(payload)
        body: dict[str, Any] = {"embeddings": [{"values": vector} for vector in vectors]}
        return 200, body

    return transport


def test_one_request_per_batch_of_100() -> None:
    batches: list[int] = []

    def transport(
        url: str, headers: dict[str, str], payload: dict[str, Any]
    ) -> tuple[int, dict[str, Any]]:
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

    def transport(
        url: str, headers: dict[str, str], payload: dict[str, Any]
    ) -> tuple[int, dict[str, Any]]:
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

    def transport(
        url: str, headers: dict[str, str], payload: dict[str, Any]
    ) -> tuple[int, dict[str, Any]]:
        return 429, {"error": "rate limited"}

    with pytest.raises(EmbeddingError, match="3 attempts"):
        GeminiEmbedder(api_key="k", transport=transport, sleep=sleeps.append).embed(
            ["one"], TASK_DOCUMENT
        )
    assert sleeps == [2, 4]


def test_a_400_is_not_retried() -> None:
    calls: list[int] = []

    def transport(
        url: str, headers: dict[str, str], payload: dict[str, Any]
    ) -> tuple[int, dict[str, Any]]:
        calls.append(1)
        return 400, {"error": "invalid api key"}

    with pytest.raises(EmbeddingError, match="embedding failed"):
        GeminiEmbedder(api_key="bad", transport=transport).embed(["one"], TASK_DOCUMENT)
    assert len(calls) == 1


def test_a_400_reports_the_attempt_that_failed() -> None:
    def transport(
        url: str, headers: dict[str, str], payload: dict[str, Any]
    ) -> tuple[int, dict[str, Any]]:
        return 400, {"error": "invalid api key"}

    with pytest.raises(EmbeddingError, match=r"after 1 attempt\b"):
        GeminiEmbedder(api_key="bad", transport=transport).embed(["one"], TASK_DOCUMENT)


def test_build_embedder_keeps_the_web_model_id(monkeypatch: pytest.MonkeyPatch) -> None:
    # chunks.embedding_model must hold the same 'provider:model' string as the web gateway.
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    monkeypatch.setenv("AI_EMBEDDING_MODEL", "google:gemini-embedding-2")
    assert build_embedder().model == "google:gemini-embedding-2"


def test_build_embedder_defaults_to_the_web_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    monkeypatch.delenv("AI_EMBEDDING_MODEL", raising=False)
    assert build_embedder().model == "google:gemini-embedding-001"


def test_build_embedder_accepts_a_bare_model_name(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    monkeypatch.setenv("AI_EMBEDDING_MODEL", "gemini-embedding-001")
    assert build_embedder().model == "google:gemini-embedding-001"


def test_the_api_key_is_sent_in_a_header_not_the_url() -> None:
    seen: list[tuple[str, dict[str, str]]] = []

    def transport(
        url: str, headers: dict[str, str], payload: dict[str, Any]
    ) -> tuple[int, dict[str, Any]]:
        seen.append((url, headers))
        return 200, {"embeddings": [{"values": _vectors(1, EMBEDDING_DIMENSIONS)[0]}]}

    GeminiEmbedder(api_key="secret-key", transport=transport).embed(["one"], TASK_DOCUMENT)
    url, headers = seen[0]
    assert "secret-key" not in url
    assert headers == {"x-goog-api-key": "secret-key"}


def test_a_timeout_is_retried_then_reported_as_embedding_error() -> None:
    sleeps: list[float] = []

    def transport(
        url: str, headers: dict[str, str], payload: dict[str, Any]
    ) -> tuple[int, dict[str, Any]]:
        raise TransientTransportError("ReadTimeout")

    with pytest.raises(EmbeddingError, match=r"after 3 attempts \(no response: ReadTimeout\)"):
        GeminiEmbedder(api_key="k", transport=transport, sleep=sleeps.append).embed(
            ["one"], TASK_DOCUMENT
        )
    assert sleeps == [2, 4]


@pytest.mark.parametrize(
    "body",
    [{}, {"embeddings": [{}]}, {"embeddings": "oops"}, {"embeddings": [None]}],
)
def test_a_malformed_200_body_is_an_embedding_error(body: dict[str, Any]) -> None:
    def transport(
        url: str, headers: dict[str, str], payload: dict[str, Any]
    ) -> tuple[int, dict[str, Any]]:
        return 200, body

    with pytest.raises(EmbeddingError):
        GeminiEmbedder(api_key="k", transport=transport).embed(["one"], TASK_DOCUMENT)


def test_httpx_transport_turns_a_non_json_error_page_into_a_body(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def post(url: str, **kwargs: Any) -> httpx.Response:
        return httpx.Response(503, text="<html>Service Unavailable</html>")

    monkeypatch.setattr(httpx, "post", post)
    status, body = _httpx_transport("https://example.test", {}, {})
    assert status == 503
    assert "Service Unavailable" in body["error"]


def test_httpx_transport_raises_transient_on_a_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    def post(url: str, **kwargs: Any) -> httpx.Response:
        raise httpx.ReadTimeout("timed out")

    monkeypatch.setattr(httpx, "post", post)
    with pytest.raises(TransientTransportError, match="ReadTimeout"):
        _httpx_transport("https://example.test", {}, {})


def test_build_embedder_rejects_a_non_google_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    monkeypatch.setenv("AI_EMBEDDING_MODEL", "openai:text-embedding-3-large")
    with pytest.raises(EmbeddingError, match="google provider"):
        build_embedder()


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

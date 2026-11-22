"""Ports and adapters for the Python side: the Embedder the steps call."""

from __future__ import annotations

import math
import os
import time
from collections.abc import Callable
from typing import Any, Protocol

from config import (
    EMBEDDING_BATCH_SIZE,
    EMBEDDING_DIMENSIONS,
    EMBEDDING_MAX_ATTEMPTS,
)

TASK_DOCUMENT = "RETRIEVAL_DOCUMENT"
TASK_QUERY = "RETRIEVAL_QUERY"
_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models"
_PROVIDER = "google"
_DEFAULT_MODEL = f"{_PROVIDER}:gemini-embedding-001"

# (url, headers, payload) -> (status, body); raises TransientTransportError if no response came.
Transport = Callable[[str, dict[str, str], dict[str, Any]], tuple[int, dict[str, Any]]]


class EmbeddingError(Exception):
    """The embedder could not produce a usable vector."""


class TransientTransportError(Exception):
    """No HTTP response (timeout, connection reset): worth another attempt."""


class Embedder(Protocol):
    model: str

    def embed(self, texts: list[str], task: str) -> list[list[float]]: ...


def normalise(vector: list[float]) -> list[float]:
    """Scale a vector to unit length; the API only normalises its full 3,072 output."""
    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0.0:
        raise EmbeddingError("empty vector: cannot normalise")
    return [value / norm for value in vector]


def _google_model_name(model_id: str) -> str:
    """'google:<model>' or a bare '<model>' -> '<model>'; any other provider is a config mistake."""
    provider, separator, name = model_id.partition(":")
    if not separator:
        return model_id
    if provider != _PROVIDER:
        raise EmbeddingError(f"AI_EMBEDDING_MODEL must name the google provider, got {model_id!r}")
    return name


class GeminiEmbedder:
    # Stored on every chunk as 'provider:model', the same string the web gateway uses (ADR 0014).
    model: str

    def __init__(
        self,
        api_key: str,
        model: str = _DEFAULT_MODEL,
        transport: Transport | None = None,
        sleep: Callable[[float], None] = time.sleep,
        max_attempts: int = EMBEDDING_MAX_ATTEMPTS,
    ) -> None:
        self._api_model = _google_model_name(model)
        self.model = f"{_PROVIDER}:{self._api_model}"
        self._api_key = api_key
        self._transport: Transport = transport or _httpx_transport
        self._sleep = sleep
        self._max_attempts = max_attempts

    def _payload(self, texts: list[str], task: str) -> dict[str, Any]:
        return {
            "requests": [
                {
                    "model": f"models/{self._api_model}",
                    "content": {"parts": [{"text": text}]},
                    "taskType": task,
                    "outputDimensionality": EMBEDDING_DIMENSIONS,
                }
                for text in texts
            ]
        }

    def embed(self, texts: list[str], task: str) -> list[list[float]]:
        if not texts:
            return []
        vectors: list[list[float]] = []
        for start in range(0, len(texts), EMBEDDING_BATCH_SIZE):
            batch = texts[start : start + EMBEDDING_BATCH_SIZE]
            body = self._call(self._payload(batch, task))
            values = _vectors_from(body)
            if len(values) != len(batch):
                raise EmbeddingError(f"asked for {len(batch)} embeddings, got {len(values)}")
            for vector in values:
                if len(vector) != EMBEDDING_DIMENSIONS:
                    raise EmbeddingError(
                        f"expected {EMBEDDING_DIMENSIONS} dimensions, got {len(vector)}"
                    )
                vectors.append(normalise(vector))
        return vectors

    def _call(self, payload: dict[str, Any]) -> dict[str, Any]:
        # The key goes in a header, never the URL: HTTP clients log URLs at INFO.
        url = f"{_ENDPOINT}/{self._api_model}:batchEmbedContents"
        headers = {"x-goog-api-key": self._api_key}
        last = "no attempt made"
        attempts_made = 0
        for attempt in range(1, self._max_attempts + 1):
            attempts_made = attempt
            try:
                status, body = self._transport(url, headers, payload)
            except TransientTransportError as error:
                last = f"no response: {error}"
            else:
                if status == 200:
                    return body
                last = f"status {status}: {body}"
                if status != 429 and status < 500:
                    break
            if attempt < self._max_attempts:
                self._sleep(2**attempt)
        plural = "attempt" if attempts_made == 1 else "attempts"
        raise EmbeddingError(f"embedding failed after {attempts_made} {plural} ({last})")


def _vectors_from(body: dict[str, Any]) -> list[list[float]]:
    embeddings = body.get("embeddings")
    if not isinstance(embeddings, list):
        raise EmbeddingError(f"response has no 'embeddings' list: {str(body)[:200]}")
    vectors: list[list[float]] = []
    for item in embeddings:
        values = item.get("values") if isinstance(item, dict) else None
        if not isinstance(values, list):
            raise EmbeddingError(f"embedding without 'values': {str(item)[:200]}")
        vectors.append(values)
    return vectors


def _httpx_transport(
    url: str, headers: dict[str, str], payload: dict[str, Any]
) -> tuple[int, dict[str, Any]]:
    import httpx

    try:
        response = httpx.post(url, headers=headers, json=payload, timeout=30)
    except httpx.TransportError as error:
        raise TransientTransportError(type(error).__name__) from error
    try:
        parsed = response.json() if response.content else {}
    except ValueError:
        parsed = {"error": response.text[:200]}  # a proxy's HTML error page, for example
    body: dict[str, Any] = parsed if isinstance(parsed, dict) else {"error": str(parsed)[:200]}
    return response.status_code, body


class FakeEmbedder:
    """Deterministic, normalised, no network: what the unit tests use."""

    model = "fake-embedder"

    def embed(self, texts: list[str], task: str) -> list[list[float]]:
        vectors: list[list[float]] = []
        for text in texts:
            seed = sum(ord(character) for character in text) or 1
            raw = [((seed + index) % 89) / 89 for index in range(EMBEDDING_DIMENSIONS)]
            vectors.append(normalise(raw))
        return vectors


def build_embedder() -> Embedder:
    """Read the environment at run time, never at import time (see D9)."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise EmbeddingError("missing environment variable: GEMINI_API_KEY")
    return GeminiEmbedder(
        api_key=api_key, model=os.environ.get("AI_EMBEDDING_MODEL", _DEFAULT_MODEL)
    )

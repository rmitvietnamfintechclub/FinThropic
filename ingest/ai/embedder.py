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
_DEFAULT_MODEL = "gemini-embedding-001"

Transport = Callable[[str, dict[str, Any]], tuple[int, dict[str, Any]]]


class EmbeddingError(Exception):
    """The embedder could not produce a usable vector."""


class Embedder(Protocol):
    model: str

    def embed(self, texts: list[str], task: str) -> list[list[float]]: ...


def normalise(vector: list[float]) -> list[float]:
    """Scale a vector to unit length; the API only normalises its full 3,072 output."""
    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0.0:
        raise EmbeddingError("empty vector: cannot normalise")
    return [value / norm for value in vector]


class GeminiEmbedder:
    model: str

    def __init__(
        self,
        api_key: str,
        model: str = _DEFAULT_MODEL,
        transport: Transport | None = None,
        sleep: Callable[[float], None] = time.sleep,
        max_attempts: int = EMBEDDING_MAX_ATTEMPTS,
    ) -> None:
        self.model = model
        self._api_key = api_key
        self._transport: Transport = transport or _httpx_transport
        self._sleep = sleep
        self._max_attempts = max_attempts

    def _payload(self, texts: list[str], task: str) -> dict[str, Any]:
        return {
            "requests": [
                {
                    "model": f"models/{self.model}",
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
            body = self._call(self._url(), self._payload(batch, task))
            values = [item["values"] for item in body["embeddings"]]
            if len(values) != len(batch):
                raise EmbeddingError(f"asked for {len(batch)} embeddings, got {len(values)}")
            for vector in values:
                if len(vector) != EMBEDDING_DIMENSIONS:
                    raise EmbeddingError(
                        f"expected {EMBEDDING_DIMENSIONS} dimensions, got {len(vector)}"
                    )
                vectors.append(normalise(vector))
        return vectors

    def _url(self) -> str:
        return f"{_ENDPOINT}/{self.model}:batchEmbedContents?key={self._api_key}"

    def _call(self, url: str, payload: dict[str, Any]) -> dict[str, Any]:
        last = "no attempt made"
        attempts_made = 0
        for attempt in range(1, self._max_attempts + 1):
            attempts_made = attempt
            status, body = self._transport(url, payload)
            if status == 200:
                return body
            last = f"status {status}: {body}"
            if status != 429 and status < 500:
                break
            if attempt < self._max_attempts:
                self._sleep(2**attempt)
        plural = "attempt" if attempts_made == 1 else "attempts"
        raise EmbeddingError(f"embedding failed after {attempts_made} {plural} ({last})")


def _httpx_transport(url: str, payload: dict[str, Any]) -> tuple[int, dict[str, Any]]:
    import httpx

    response = httpx.post(url, json=payload, timeout=30)
    body: dict[str, Any] = response.json() if response.content else {}
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


def _model_from_env() -> str:
    """Read AI_EMBEDDING_MODEL, which the web app writes as '<provider>:<model>'."""
    raw = os.environ.get("AI_EMBEDDING_MODEL", f"google:{_DEFAULT_MODEL}")
    provider, separator, model = raw.partition(":")
    if not separator:
        return raw  # a bare model name is accepted
    if provider != "google":
        raise EmbeddingError(f"AI_EMBEDDING_MODEL must name the google provider, got {raw!r}")
    return model


def build_embedder() -> Embedder:
    """Read the environment at run time, never at import time (see D9)."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise EmbeddingError("missing environment variable: GEMINI_API_KEY")
    return GeminiEmbedder(api_key=api_key, model=_model_from_env())

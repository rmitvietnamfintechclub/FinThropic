"""The only place the worker writes to Supabase: document status, warnings and chunks."""

from __future__ import annotations

import os
from collections.abc import Callable
from typing import Any, Protocol

from models.chunk import Chunk

Transport = Callable[[str, str, dict[str, Any], dict[str, str]], tuple[int, dict[str, Any]]]


class RepositoryError(Exception):
    """The worker could not write to Supabase."""


class DocumentWriter(Protocol):
    def mark_processing(self, document_id: str) -> None: ...

    def mark_failed(self, document_id: str, error: str) -> None: ...

    def save_result(
        self,
        document_id: str,
        chunks: list[Chunk],
        warnings: list[str],
        status: str = "ready",
        error: str | None = None,
    ) -> None: ...


class SupabaseDocumentWriter:
    """One httpx POST to the PostgREST RPC endpoint; the function does the transaction."""

    def __init__(self, transport: Transport | None = None) -> None:
        self._transport: Transport = transport or _httpx_transport

    def mark_processing(self, document_id: str) -> None:
        self._patch_document(document_id, {"status": "processing"})

    def mark_failed(self, document_id: str, error: str) -> None:
        self._patch_document(document_id, {"status": "failed", "error": error})

    def save_result(
        self,
        document_id: str,
        chunks: list[Chunk],
        warnings: list[str],
        status: str = "ready",
        error: str | None = None,
    ) -> None:
        payload_chunks: list[dict[str, Any]] = []
        for chunk in chunks:
            embedding = chunk.embedding
            if embedding is None:
                raise RepositoryError(f"chunk {chunk.chunk_index} has no embedding")
            payload_chunks.append(
                {
                    "chunk_index": chunk.chunk_index,
                    "page": chunk.page,
                    "text": chunk.text,
                    "embedding": embedding,
                    "embedding_model": chunk.embedding_model,
                    "pipeline_version": chunk.pipeline_version,
                }
            )
        body: dict[str, Any] = {
            "p_document_id": document_id,
            "p_status": status,
            "p_error": error,
            "p_warnings": warnings,
            "p_chunks": payload_chunks,
        }
        self._request("POST", "/rest/v1/rpc/replace_document_chunks", body)

    def _patch_document(self, document_id: str, fields: dict[str, Any]) -> None:
        self._request(
            "PATCH",
            f"/rest/v1/documents?id=eq.{document_id}",
            fields,
            prefer="return=minimal",
        )

    def _request(
        self,
        method: str,
        path: str,
        body: dict[str, Any],
        prefer: str | None = None,
    ) -> dict[str, Any]:
        url, key = self._credentials()
        headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }
        if prefer is not None:
            headers["Prefer"] = prefer
        status, response = self._transport(method, f"{url}{path}", body, headers)
        if not 200 <= status < 300:
            raise RepositoryError(
                f"SUPABASE_URL {url}: {method} {path} failed with status {status}: {response}"
            )
        return response

    def _credentials(self) -> tuple[str, str]:
        url = os.environ.get("SUPABASE_URL")
        if not url:
            raise RepositoryError("missing environment variable: SUPABASE_URL")
        key = os.environ.get("SUPABASE_SECRET_KEY")
        if not key:
            raise RepositoryError("missing environment variable: SUPABASE_SECRET_KEY")
        return url.rstrip("/"), key


def _httpx_transport(
    method: str, url: str, payload: dict[str, Any], headers: dict[str, str]
) -> tuple[int, dict[str, Any]]:
    import httpx

    try:
        response = httpx.request(method, url, json=payload, headers=headers, timeout=30)
    except (httpx.HTTPError, httpx.InvalidURL) as exc:
        raise RepositoryError(f"cannot reach SUPABASE_URL: {exc}") from exc
    body: dict[str, Any] = response.json() if response.content else {}
    return response.status_code, body


class NullDocumentWriter:
    """A writer that does nothing: the runner's default when no Supabase is configured."""

    def mark_processing(self, document_id: str) -> None:
        pass

    def mark_failed(self, document_id: str, error: str) -> None:
        pass

    def save_result(
        self,
        document_id: str,
        chunks: list[Chunk],
        warnings: list[str],
        status: str = "ready",
        error: str | None = None,
    ) -> None:
        pass


class FakeDocumentWriter:
    """Records calls for unit tests; no network, no database."""

    def __init__(self) -> None:
        self.calls: list[str] = []
        self.saved: list[tuple[str, list[Chunk], list[str], str, str | None]] = []
        self.failures: list[tuple[str, str]] = []

    def mark_processing(self, document_id: str) -> None:
        self.calls.append("mark_processing")

    def mark_failed(self, document_id: str, error: str) -> None:
        self.calls.append("mark_failed")
        self.failures.append((document_id, error))

    def save_result(
        self,
        document_id: str,
        chunks: list[Chunk],
        warnings: list[str],
        status: str = "ready",
        error: str | None = None,
    ) -> None:
        self.calls.append("save_result")
        self.saved.append((document_id, chunks, warnings, status, error))

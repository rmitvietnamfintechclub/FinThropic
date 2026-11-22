"""Turn each chunk into a normalised vector with task type 'document'."""

from __future__ import annotations

from ai.embedder import TASK_DOCUMENT, Embedder, build_embedder
from config import PIPELINE_VERSION
from models.chunk import Context


class EmbedStep:
    name = "embed"

    def __init__(self, embedder: Embedder | None = None) -> None:
        self._embedder = embedder

    def run(self, ctx: Context) -> Context:
        if not ctx.chunks:
            return ctx
        embedder = self._embedder or build_embedder()
        vectors = embedder.embed([chunk.text for chunk in ctx.chunks], TASK_DOCUMENT)
        for chunk, vector in zip(ctx.chunks, vectors, strict=True):
            chunk.embedding = vector
            chunk.embedding_model = embedder.model
            chunk.pipeline_version = PIPELINE_VERSION
        return ctx

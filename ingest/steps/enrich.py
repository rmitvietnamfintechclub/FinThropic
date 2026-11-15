"""Add the document title and the nearest heading to each chunk before embedding.

This is the cheap version of contextual retrieval.

TODO PBI-008 (AI/RAG 2). Open point: does enrichment improve hits on the tuning set?
"""

from __future__ import annotations

from models.chunk import Context


class EnrichStep:
    name = "enrich"

    def run(self, ctx: Context) -> Context:
        return ctx

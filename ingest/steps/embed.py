"""Turn each chunk into a normalized vector (1,536 numbers) with task type 'document'.

TODO PBI-003 (AI/RAG 2): use the Embedder port, never the provider SDK directly.
"""

from __future__ import annotations

from models.chunk import Context


class EmbedStep:
    name = "embed"

    def run(self, ctx: Context) -> Context:
        # Placeholder so the walking skeleton runs end to end. Replace in the PBI named above.
        return ctx

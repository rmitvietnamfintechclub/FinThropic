"""Cut page text into chunks that keep document id, page and position.

TODO PBI-003 (AI/RAG 2): baseline = about 500 tokens per chunk. Open point: choose the method
by test (fixed, recursive, structure-based, semantic) on the sample decks; write the result in
the PR note.
"""

from __future__ import annotations

from models.chunk import Context


class ChunkStep:
    name = "chunk"

    def run(self, ctx: Context) -> Context:
        # Placeholder so the walking skeleton runs end to end. Replace in the PBI named above.
        return ctx

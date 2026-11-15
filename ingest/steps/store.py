"""Write chunks, their embeddings and the document status to Supabase.

TODO PBI-003 / PBI-021: status ready, failed or ready with warnings; one transaction per document.
"""

from __future__ import annotations

from models.chunk import Context


class StoreStep:
    name = "store"

    def run(self, ctx: Context) -> Context:
        # Placeholder so the walking skeleton runs end to end. Replace in the PBI named above.
        return ctx

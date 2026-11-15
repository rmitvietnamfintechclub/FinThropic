"""Read the PDF page by page. Keep the real page number and count the pictures on each page.

TODO PBI-003 (AI/RAG 2): baseline = text per page. Open points: footer removal, mixed PDFs
(page with pictures and little text gets a warning), reading flagged pages by OCR or a vision model.
"""

from __future__ import annotations

from models.chunk import Context


class ParseStep:
    name = "parse"

    def run(self, ctx: Context) -> Context:
        # Placeholder so the walking skeleton runs end to end. Replace in the PBI named above.
        return ctx

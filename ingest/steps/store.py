"""Write chunks, their embeddings and the document status to Supabase."""

from __future__ import annotations

from config import LOW_TEXT_WORDS
from models.chunk import Context, Page
from repositories.documents import DocumentWriter, SupabaseDocumentWriter


def page_warnings(pages: list[Page]) -> list[str]:
    """A page with a picture and fewer than LOW_TEXT_WORDS words gets a warning."""
    return [
        f"page {page.number}: picture, little text"
        for page in pages
        if page.image_count > 0 and len(page.text.split()) < LOW_TEXT_WORDS
    ]


class StoreStep:
    name = "store"

    def __init__(self, writer: DocumentWriter | None = None) -> None:
        self._writer = writer

    def run(self, ctx: Context) -> Context:
        ctx.warnings = page_warnings(ctx.pages)
        writer = self._writer or SupabaseDocumentWriter()
        if not ctx.chunks:
            writer.mark_failed(ctx.document_id, "no chunk produced")
            return ctx
        writer.save_result(ctx.document_id, ctx.chunks, ctx.warnings)
        return ctx

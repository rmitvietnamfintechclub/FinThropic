"""Cut page text into chunks that keep document id, page and position.

The budget is approximate: `estimate_tokens` divides the character count by `CHARS_PER_TOKEN`, so
500 tokens means about 2,000 characters, not an exact tokenizer count. A chunk always comes from
one page. A nearly empty divider slide folds into the previous page, so its text is cited with the
previous page number (the deliberate trade against "one chunk never spans two pages"). A short
trailing piece is appended to the chunk before it, so that chunk can exceed the budget by the
leftover (a few tokens), which is cheaper than dropping the text.
"""

from __future__ import annotations

from config import CHARS_PER_TOKEN, CHUNK_TARGET_TOKENS, MIN_CHUNK_TOKENS, NEAR_EMPTY_WORDS
from models.chunk import Chunk, Context, Page


def estimate_tokens(text: str) -> int:
    """Approximate the token count: the model tokenizer is deliberately not a dependency."""
    return -(-len(text) // CHARS_PER_TOKEN)


def _split_keep(text: str, separator: str) -> list[str]:
    """Split on a separator, keeping it at the end of each piece so no text is lost."""
    parts = text.split(separator)
    pieces = [part + separator for part in parts[:-1]]
    pieces.append(parts[-1])
    return [piece for piece in pieces if piece]


def _split_to_budget(text: str, budget: int) -> list[str]:
    """Split into pieces under the budget, then pack neighbours back together greedily."""
    if estimate_tokens(text) <= budget:
        return [text]
    for separator in ("\n\n", "\n", ". ", " "):
        if separator not in text:
            continue
        pieces = _split_keep(text, separator)
        if len(pieces) < 2:
            continue
        units: list[str] = []
        for piece in pieces:
            if estimate_tokens(piece) <= budget:
                units.append(piece)
            else:
                units.extend(_split_to_budget(piece, budget))
        packed: list[str] = []
        buffer = ""
        for unit in units:
            if not buffer:
                buffer = unit
            elif estimate_tokens(buffer + unit) <= budget:
                buffer += unit
            else:
                packed.append(buffer)
                buffer = unit
        if buffer:
            packed.append(buffer)
        return [piece for piece in packed if piece.strip()]
    return [text]


def _absorb_short_pieces(pieces: list[str]) -> list[str]:
    """Append a leftover smaller than MIN_CHUNK_TOKENS to the piece before it."""
    merged: list[str] = []
    for piece in pieces:
        if merged and estimate_tokens(piece.strip()) < MIN_CHUNK_TOKENS:
            merged[-1] = merged[-1] + piece
            continue
        merged.append(piece)
    return merged


def _merge_near_empty(pages: list[Page]) -> list[Page]:
    """Fold one nearly empty slide into its neighbour; never a chain of them."""
    merged: list[Page] = []
    absorbed = False
    for page in pages:
        if merged and not absorbed and len(page.text.split()) < NEAR_EMPTY_WORDS:
            previous = merged[-1]
            joined = f"{previous.text}\n{page.text}".strip()
            if estimate_tokens(joined) <= CHUNK_TARGET_TOKENS:
                merged[-1] = Page(
                    number=previous.number,
                    text=joined,
                    image_count=previous.image_count + page.image_count,
                )
                absorbed = True
                continue
        merged.append(Page(number=page.number, text=page.text, image_count=page.image_count))
        absorbed = False
    return merged


def chunk(document_id: str, pages: list[Page]) -> list[Chunk]:
    """Cut the pages into chunks, one page at a time, numbered across the document."""
    chunks: list[Chunk] = []
    position = 0
    for page in _merge_near_empty(pages):
        text = page.text.strip()
        if not text:
            continue
        for piece in _absorb_short_pieces(_split_to_budget(text, CHUNK_TARGET_TOKENS)):
            body = piece.strip()
            if not body:
                continue
            chunks.append(
                Chunk(document_id=document_id, page=page.number, position=position, text=body)
            )
            position += 1
    return chunks


class ChunkStep:
    name = "chunk"

    def run(self, ctx: Context) -> Context:
        ctx.chunks = chunk(ctx.document_id, ctx.pages)
        return ctx

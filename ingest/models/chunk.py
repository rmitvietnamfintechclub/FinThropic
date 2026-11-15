"""Data shapes shared by the steps. No I/O here."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Page:
    number: int  # the real PDF page index, starting at 1 (never the number printed on the slide)
    text: str
    image_count: int = 0


@dataclass
class Chunk:
    document_id: str
    page: int
    position: int
    text: str
    embedding: list[float] | None = None
    warnings: list[str] = field(default_factory=list)


@dataclass
class Context:
    """What flows through the pipeline. Each step reads it and returns it with fields added."""

    document_id: str
    path: str
    pages: list[Page] = field(default_factory=list)
    chunks: list[Chunk] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

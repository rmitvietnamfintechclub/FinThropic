"""Pipes and filters: the runner chains steps in order. It knows nothing about what a step does."""

from __future__ import annotations

import logging
import time
from collections.abc import Sequence

from models.chunk import Context
from steps.base import Step
from steps.chunk import ChunkStep
from steps.embed import EmbedStep
from steps.enrich import EnrichStep
from steps.parse import ParseStep
from steps.store import StoreStep

log = logging.getLogger("ingest")


def default_steps() -> list[Step]:
    return [ParseStep(), ChunkStep(), EnrichStep(), EmbedStep(), StoreStep()]


def run(ctx: Context, steps: Sequence[Step] | None = None) -> Context:
    for step in default_steps() if steps is None else steps:
        started = time.perf_counter()
        ctx = step.run(ctx)
        log.info(
            "step=%s document=%s ms=%.0f",
            step.name,
            ctx.document_id,
            (time.perf_counter() - started) * 1000,
        )
    return ctx

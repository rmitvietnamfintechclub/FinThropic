"""One step = one file = one job. Every step has the same shape so the runner can chain them."""

from __future__ import annotations

from typing import Protocol

from models.chunk import Context


class Step(Protocol):
    name: str

    def run(self, ctx: Context) -> Context: ...

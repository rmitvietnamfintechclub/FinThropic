import pytest

from models.chunk import Context
from pipeline import default_steps, run
from repositories.documents import NullDocumentWriter, RepositoryError


class Recorder:
    def __init__(self, name: str, log: list[str]) -> None:
        self.name, self._log = name, log

    def run(self, ctx: Context) -> Context:
        self._log.append(self.name)
        return ctx


def test_default_pipeline_has_the_five_steps_in_order() -> None:
    assert [s.name for s in default_steps()] == ["parse", "chunk", "enrich", "embed", "store"]


def test_runner_calls_steps_in_order_and_returns_the_context() -> None:
    log: list[str] = []
    ctx = Context(document_id="d1", path="x.pdf")
    out = run(ctx, [Recorder("a", log), Recorder("b", log)], writer=NullDocumentWriter())
    assert log == ["a", "b"]
    assert out.document_id == "d1"


def test_an_empty_step_list_runs_nothing() -> None:
    ctx = Context(document_id="d2", path="y.pdf")
    assert run(ctx, [], writer=NullDocumentWriter()) is ctx


def test_a_dead_supabase_url_fails_before_any_step(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("SUPABASE_URL", "http://127.0.0.1:9")
    monkeypatch.setenv("SUPABASE_SECRET_KEY", "test-secret")
    log: list[str] = []
    ctx = Context(document_id="d3", path="z.pdf")
    with pytest.raises(RepositoryError, match="SUPABASE_URL"):
        run(ctx, [Recorder("a", log)])
    assert log == []

"""Settings for the indexing job. Secrets come from environment variables, never from code."""

import os

EMBEDDING_DIMENSIONS = 768
CHUNK_TARGET_TOKENS = 500
LOW_TEXT_WORDS = 25  # a page with pictures and fewer words than this gets a warning


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing environment variable: {name}")
    return value

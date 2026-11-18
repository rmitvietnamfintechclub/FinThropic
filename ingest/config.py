"""Settings for the indexing job. Secrets come from environment variables, never from code."""

import os

EMBEDDING_DIMENSIONS = 1536
CHUNK_TARGET_TOKENS = 500
LOW_TEXT_WORDS = 25  # a page with pictures and fewer words than this gets a warning
MAX_REPEATED_LINE_WORDS = 12  # longer lines repeated on most pages are body text, not a footer
MIN_PAGES_FOR_REPEAT_RULE = 3  # below this "more than half of the pages" says nothing


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing environment variable: {name}")
    return value

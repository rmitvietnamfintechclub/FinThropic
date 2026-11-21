"""Settings for the indexing job. Secrets come from environment variables, never from code."""

import os

EMBEDDING_DIMENSIONS = 768
PIPELINE_VERSION = "v1"  # bump when parsing, chunking or embedding changes
EMBEDDING_BATCH_SIZE = 100  # texts per request, keeps the free-key quota simple
EMBEDDING_MAX_ATTEMPTS = 3  # retries only 429/5xx; a bad request fails at once
CHUNK_TARGET_TOKENS = 500
CHARS_PER_TOKEN = 4  # approximation: the tokenizer is not a dependency, 500 tokens is ~2,000 chars
MIN_CHUNK_TOKENS = 5  # a smaller leftover piece is dropped when the page split into several
NEAR_EMPTY_WORDS = 8  # a page below this word count is a divider, so it folds into its neighbour
LOW_TEXT_WORDS = 25  # a page with pictures and fewer words than this gets a warning
MAX_REPEATED_LINE_WORDS = 12  # longer lines repeated on most pages are body text, not a footer
MIN_PAGES_FOR_REPEAT_RULE = 3  # below this "more than half of the pages" says nothing


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing environment variable: {name}")
    return value

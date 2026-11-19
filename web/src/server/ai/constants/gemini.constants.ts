import "server-only";

// Draft models (PBI-004). PBI-020 and PBI-027 pick the final ones by measurement: change them here only.
export const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";
export const GEMINI_GENERATION_MODEL = "gemini-3.5-flash-lite";

/** Matches the vector(1536) column. gemini-embedding-001 only normalizes its full 3,072 output. */
export const EMBEDDING_DIMENSIONS = 1536;

/** Per attempt. A call gets one retry, so the worst case is twice this. */
export const GEMINI_TIMEOUT_MS = 15_000;
export const GEMINI_ATTEMPTS = 2;

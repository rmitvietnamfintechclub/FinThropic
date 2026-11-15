import "server-only";

// Structured JSON logs: one line per event, easy to search on Vercel. No dependency on purpose (ADR 0008).
// Never log secrets, tokens, passwords, full questions from members, or document text.
type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function minLevel(): number {
  const configured = process.env.LOG_LEVEL as Level | undefined;
  return LEVELS[configured ?? "info"] ?? LEVELS.info;
}

function emit(level: Level, message: string, fields: Fields = {}) {
  if (LEVELS[level] < minLevel()) return;
  const line = JSON.stringify({ level, message, time: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  // stdout for debug and info, as hosting platforms expect; the only place that may log there.
  // eslint-disable-next-line no-console
  else console.log(line);
}

export const logger = {
  debug: (message: string, fields?: Fields) => emit("debug", message, fields),
  info: (message: string, fields?: Fields) => emit("info", message, fields),
  warn: (message: string, fields?: Fields) => emit("warn", message, fields),
  error: (message: string, fields?: Fields) => emit("error", message, fields),
};

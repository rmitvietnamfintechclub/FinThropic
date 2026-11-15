import type { z } from "zod";

// The only place that calls fetch from the browser. Services use this, components never do.
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export class ContractError extends Error {
  constructor(readonly path: string) {
    super(`Response from ${path} does not match its contract`);
  }
}

// TypeScript types are erased at build time, so a cast checks nothing. Every response is parsed with
// its contract schema: unknown fields are dropped, a wrong type throws ContractError.
export async function getJson<S extends z.ZodType>(
  path: string,
  schema: S,
  init?: RequestInit,
): Promise<z.output<S>> {
  const response = await fetch(path, { ...init, headers: { Accept: "application/json" } });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok && response.status !== 503) {
    throw new HttpError(response.status, `Request to ${path} failed`);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ContractError(path);
  return parsed.data;
}

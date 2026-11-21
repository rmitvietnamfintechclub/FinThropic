import "server-only";

/** The AI provider failed or timed out. The chat route turns this into a service error, never the fallback reply. */
export class ProviderError extends Error {
  readonly kind: "timeout" | "failure";

  constructor(kind: "timeout" | "failure", message: string) {
    super(message);
    this.name = "ProviderError";
    this.kind = kind;
  }
}

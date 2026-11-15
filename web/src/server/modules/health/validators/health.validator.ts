import { z } from "zod";

// Validator: every input is checked here before a service sees it.
const querySchema = z.object({ deep: z.enum(["0", "1"]).default("0") });

export function parseHealthQuery(url: URL): { deep: boolean } {
  const parsed = querySchema.parse({ deep: url.searchParams.get("deep") ?? undefined });
  return { deep: parsed.deep === "1" };
}

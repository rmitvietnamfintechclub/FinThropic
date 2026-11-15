import { z } from "zod";

// Wire contract for GET /api/health. One definition for both sides: the backend builds this shape,
// the frontend service parses it. Rules for this folder: import only zod and other contracts;
// never import from src/server or from client folders (docs/adr/0011).
export const healthDtoSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  database: z.enum(["ok", "fail", "skipped"]),
  checkedAt: z.string(),
});

export type HealthDto = z.infer<typeof healthDtoSchema>;

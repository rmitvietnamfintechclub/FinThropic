import { describe, expect, it } from "vitest";
import { readEnv } from "./env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SECRET_KEY: "secret",
  GEMINI_API_KEY: "gemini",
};

describe("readEnv", () => {
  it("returns the values when all variables are set", () => {
    expect(readEnv(valid).GEMINI_API_KEY).toBe("gemini");
  });

  it("names the missing variable (PBI-001 TC4)", () => {
    expect(() => readEnv({ ...valid, GEMINI_API_KEY: undefined })).toThrow("GEMINI_API_KEY");
  });

  it("rejects an empty secret", () => {
    expect(() => readEnv({ ...valid, SUPABASE_SECRET_KEY: "" })).toThrow("SUPABASE_SECRET_KEY");
  });
});

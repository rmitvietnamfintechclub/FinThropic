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

  it("defaults the AI models to Google", () => {
    const env = readEnv(valid);
    expect(env.AI_EMBEDDING_MODEL).toBe("google:gemini-embedding-001");
    expect(env.AI_CHAT_MODEL).toBe("google:gemini-3.5-flash-lite");
  });

  it("accepts a provider:model string for a registered provider", () => {
    expect(readEnv({ ...valid, AI_CHAT_MODEL: "google:gemini-2.5-pro" }).AI_CHAT_MODEL).toBe(
      "google:gemini-2.5-pro",
    );
  });

  it.each(["openai:text-embedding-3-small", "gemini-embedding-001", "google:", ":model", ""])(
    "rejects the model string %j",
    (value) => {
      expect(() => readEnv({ ...valid, AI_EMBEDDING_MODEL: value })).toThrow("AI_EMBEDDING_MODEL");
    },
  );

  it("rejects an empty secret", () => {
    expect(() => readEnv({ ...valid, SUPABASE_SECRET_KEY: "" })).toThrow("SUPABASE_SECRET_KEY");
  });
});

import { describe, expect, it } from "vitest";
import { CHAT_QUESTION_MAX_LENGTH, chatAnswerDtoSchema, chatRequestDtoSchema } from "./chat.dto";

const CHUNK_ID = "0b7c1a52-9a3e-4f43-8d0e-6f1d2c3b4a51";
const CONVERSATION_ID = "5d1f8e2a-3c4b-4a6d-9e7f-1a2b3c4d5e6f";

const answered = {
  text: "The membership fee is paid each semester [1].",
  citations: [{ number: 1, chunkId: CHUNK_ID, documentName: "Club handbook", page: 3 }],
  outcome: "answered",
  requestId: "req-123",
};

describe("chatRequestDtoSchema", () => {
  it("accepts a question with or without a conversation id", () => {
    expect(chatRequestDtoSchema.parse({ question: "What is the fee?" })).toEqual({
      question: "What is the fee?",
    });
    expect(
      chatRequestDtoSchema.parse({ question: "And for alumni?", conversationId: CONVERSATION_ID }),
    ).toEqual({ question: "And for alumni?", conversationId: CONVERSATION_ID });
  });

  it("trims the question and rejects one that is only spaces", () => {
    expect(chatRequestDtoSchema.parse({ question: "  Hi  " }).question).toBe("Hi");
    expect(chatRequestDtoSchema.safeParse({ question: "   " }).success).toBe(false);
  });

  it("rejects a question that is too long", () => {
    const question = "a".repeat(CHAT_QUESTION_MAX_LENGTH + 1);
    expect(chatRequestDtoSchema.safeParse({ question }).success).toBe(false);
  });

  it("rejects a conversation id that is not a uuid", () => {
    const result = chatRequestDtoSchema.safeParse({ question: "Hi", conversationId: "1 OR 1=1" });
    expect(result.success).toBe(false);
  });

  it("drops fields the contract does not know", () => {
    expect(chatRequestDtoSchema.parse({ question: "Hi", role: "admin" })).toEqual({
      question: "Hi",
    });
  });
});

describe("chatAnswerDtoSchema", () => {
  it("accepts an answer with numbered citations", () => {
    expect(chatAnswerDtoSchema.parse(answered)).toEqual(answered);
  });

  it("accepts the fallback reply with no citations", () => {
    const fallback = {
      text: "I could not find this in the club documents.",
      citations: [],
      outcome: "not_available",
      requestId: "req-124",
    };
    expect(chatAnswerDtoSchema.parse(fallback)).toEqual(fallback);
  });

  it("rejects a fallback reply that carries citations", () => {
    const result = chatAnswerDtoSchema.safeParse({ ...answered, outcome: "not_available" });
    expect(result.success).toBe(false);
  });

  it("drops fields the contract does not know", () => {
    const parsed = chatAnswerDtoSchema.parse({ ...answered, prompt: "system prompt", debug: true });
    expect(parsed).toEqual(answered);
  });

  it("rejects a wrong type", () => {
    expect(chatAnswerDtoSchema.safeParse({ ...answered, outcome: "maybe" }).success).toBe(false);
    expect(
      chatAnswerDtoSchema.safeParse({
        ...answered,
        citations: [{ number: 1, chunkId: CHUNK_ID, documentName: "Club handbook", page: "3" }],
      }).success,
    ).toBe(false);
    expect(
      chatAnswerDtoSchema.safeParse({
        ...answered,
        citations: [{ number: 0, chunkId: CHUNK_ID, documentName: "Club handbook", page: 3 }],
      }).success,
    ).toBe(false);
  });
});

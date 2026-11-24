import { z } from "zod";

// Wire contract for POST /api/chat (PBI-004.5 backend, PBI-005.2 frontend). One definition for both
// sides: the backend validator parses the request and types the response with it, the frontend
// service builds the request and parses the response with it. Rules for this folder: import only
// zod and other contracts (docs/adr/0011).

/** Longest question accepted, in characters. Keeps the prompt and its cost bounded. */
export const CHAT_QUESTION_MAX_LENGTH = 1000;

// Request --------------------------------------------------------------------

export const chatRequestDtoSchema = z.object({
  /** Surrounding spaces are removed first, so "   " counts as empty and is rejected. */
  question: z.string().trim().min(1).max(CHAT_QUESTION_MAX_LENGTH),
  /** Omitted for the first question of a new conversation. */
  conversationId: z.uuid().optional(),
});

export type ChatRequestDto = z.infer<typeof chatRequestDtoSchema>;

// Response -------------------------------------------------------------------

export const chatCitationDtoSchema = z.object({
  /** The [n] marker in `text` that this citation resolves, so the screen can link them. */
  number: z.int().positive(),
  /** The chunk the fact came from; PBI-010 and PBI-019 open and re-check it by this id. */
  chunkId: z.uuid(),
  documentName: z.string().min(1),
  /** PDF page, from 1. Sections, sheets and rows for other file types come with PBI-010. */
  page: z.int().positive(),
});

export const chatAnswerDtoSchema = z
  .object({
    text: z.string(),
    citations: z.array(chatCitationDtoSchema),
    /** "not_available": nothing relevant was found, `text` is the fallback reply. */
    outcome: z.enum(["answered", "not_available"]),
    /** The same id as the x-request-id header, so a member can quote it when reporting a problem. */
    requestId: z.string().min(1),
  })
  // A fallback reply never cites anything: a citation there would point at a source that was
  // judged not relevant.
  .refine((answer) => answer.outcome === "answered" || answer.citations.length === 0, {
    message: "a not_available answer has no citations",
    path: ["citations"],
  });

export type ChatCitationDto = z.infer<typeof chatCitationDtoSchema>;
export type ChatAnswerDto = z.infer<typeof chatAnswerDtoSchema>;

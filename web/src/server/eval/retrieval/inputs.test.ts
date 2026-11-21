import { describe, expect, it } from "vitest";
import {
  InputError,
  checkInputs,
  chunkRowSchema,
  parseJsonl,
  questionRowSchema,
  type ChunkRow,
  type QuestionRow,
} from "./inputs";

function problemsOf(run: () => unknown): string[] {
  try {
    run();
  } catch (error) {
    if (error instanceof InputError) return error.problems;
    throw error;
  }
  throw new Error("expected an InputError");
}

const chunk = (chunkId: string, documentName = "a.pdf", page = 1): ChunkRow => ({
  chunkId,
  documentName,
  page,
  text: "some text",
});

describe("parseJsonl", () => {
  it("parses rows and skips blank lines", () => {
    const text = [
      JSON.stringify({ id: "q1", question: "Fee?", gold: { documentName: "a.pdf", page: 2 } }),
      "",
      JSON.stringify({ id: "q2", question: "World Cup?", gold: null }),
      "",
    ].join("\n");
    expect(parseJsonl(text, questionRowSchema, "q.jsonl")).toEqual([
      { id: "q1", question: "Fee?", gold: { documentName: "a.pdf", page: 2 } },
      { id: "q2", question: "World Cup?", gold: null },
    ]);
  });

  it("names the file, line and field of every problem", () => {
    const text = [
      JSON.stringify({ chunkId: "c1", documentName: "a.pdf", page: 0, text: "x" }),
      "{not json",
      JSON.stringify({ chunkId: "c3", documentName: "a.pdf", page: 1, text: "   " }),
      JSON.stringify({ chunkId: "c4", documentName: "a.pdf", page: 1.5, text: "x" }),
    ].join("\n");
    const problems = problemsOf(() => parseJsonl(text, chunkRowSchema, "chunks.jsonl"));
    expect(problems).toHaveLength(4);
    expect(problems[0]).toMatch(/^chunks\.jsonl:1: page: /);
    expect(problems[1]).toBe("chunks.jsonl:2: not valid JSON");
    expect(problems[2]).toMatch(/^chunks\.jsonl:3: text: /);
    expect(problems[3]).toMatch(/^chunks\.jsonl:4: page: /);
  });

  it("drops extra row fields but rejects an unknown gold field", () => {
    const ok = JSON.stringify({ id: "q1", question: "Fee?", gold: null, language: "vi" });
    expect(parseJsonl(ok, questionRowSchema, "q.jsonl")).toEqual([
      { id: "q1", question: "Fee?", gold: null },
    ]);
    const bad = JSON.stringify({
      id: "q2",
      question: "Fee?",
      gold: { documentName: "a.pdf", page: 2, section: "Fees" },
    });
    expect(problemsOf(() => parseJsonl(bad, questionRowSchema, "q.jsonl"))[0]).toMatch(
      /^q\.jsonl:1: gold: .*section/,
    );
  });

  it("requires gold to be present, either a page or null", () => {
    const text = JSON.stringify({ id: "q1", question: "Fee?" });
    expect(problemsOf(() => parseJsonl(text, questionRowSchema, "q.jsonl"))[0]).toMatch(
      /^q\.jsonl:1: gold: /,
    );
  });

  it("rejects an empty file", () => {
    expect(problemsOf(() => parseJsonl("\n\n", chunkRowSchema, "chunks.jsonl"))).toEqual([
      "chunks.jsonl: no rows",
    ]);
  });
});

describe("checkInputs", () => {
  it("accepts unique ids and gold pages that have a chunk", () => {
    const questions: QuestionRow[] = [
      { id: "q1", question: "?", gold: { documentName: "a.pdf", page: 1 } },
      { id: "q2", question: "?", gold: null },
    ];
    expect(() => checkInputs([chunk("c1"), chunk("c2")], questions)).not.toThrow();
  });

  it("reports duplicate ids and gold pages with no chunk", () => {
    const questions: QuestionRow[] = [
      { id: "q1", question: "?", gold: { documentName: "a.pdf", page: 9 } },
      { id: "q1", question: "?", gold: { documentName: "b.pdf", page: 1 } },
    ];
    expect(problemsOf(() => checkInputs([chunk("c1"), chunk("c1")], questions))).toEqual([
      'chunks: duplicate chunkId "c1"',
      'questions: duplicate id "q1"',
      'questions: "q1": gold a.pdf page 9 has no chunk',
      'questions: "q1": gold b.pdf page 1 has no chunk',
    ]);
  });
});

import "server-only";
import { z } from "zod";

// Input formats of the retrieval smoke eval. One JSON object per line (JSONL).
// Extra fields on a row are allowed and dropped (a question set may also carry its language or
// expected answer). Gold is strict: a section or sheet label is not supported yet and must not be
// silently read as a page.

export const chunkRowSchema = z.object({
  chunkId: z.string().min(1),
  documentName: z.string().min(1),
  page: z.int().positive(),
  text: z.string().trim().min(1),
});

export const goldSchema = z.strictObject({
  documentName: z.string().min(1),
  page: z.int().positive(),
});

export const questionRowSchema = z.object({
  id: z.string().min(1),
  question: z.string().trim().min(1),
  /** Where the answer is. null marks a no-answer question (nothing in the documents answers it). */
  gold: goldSchema.nullable(),
});

export type ChunkRow = z.infer<typeof chunkRowSchema>;
export type QuestionRow = z.infer<typeof questionRowSchema>;

export class InputError extends Error {
  constructor(public readonly problems: string[]) {
    super(problems.join("\n"));
    this.name = "InputError";
  }
}

/** Parses JSONL text. Blank lines are skipped. Every bad line is reported as `<label>:<line>: ...`. */
export function parseJsonl<T>(text: string, schema: z.ZodType<T>, label: string): T[] {
  const rows: T[] = [];
  const problems: string[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (line.trim() === "") return;
    const where = `${label}:${index + 1}`;
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      problems.push(`${where}: not valid JSON`);
      return;
    }
    const result = schema.safeParse(value);
    if (result.success) {
      rows.push(result.data);
      return;
    }
    for (const issue of result.error.issues) {
      const field = issue.path.length > 0 ? issue.path.join(".") : "(row)";
      problems.push(`${where}: ${field}: ${issue.message}`);
    }
  });
  if (problems.length === 0 && rows.length === 0) problems.push(`${label}: no rows`);
  if (problems.length > 0) throw new InputError(problems);
  return rows;
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
}

/** Checks that ids are unique and that every gold label points at a page that has a chunk. */
export function checkInputs(chunks: ChunkRow[], questions: QuestionRow[]): void {
  const problems: string[] = [];
  for (const id of duplicates(chunks.map((chunk) => chunk.chunkId))) {
    problems.push(`chunks: duplicate chunkId "${id}"`);
  }
  for (const id of duplicates(questions.map((question) => question.id))) {
    problems.push(`questions: duplicate id "${id}"`);
  }
  const pages = new Set(chunks.map((chunk) => pageKey(chunk.documentName, chunk.page)));
  for (const question of questions) {
    if (question.gold && !pages.has(pageKey(question.gold.documentName, question.gold.page))) {
      problems.push(
        `questions: "${question.id}": gold ${question.gold.documentName} page ${question.gold.page} has no chunk`,
      );
    }
  }
  if (problems.length > 0) throw new InputError(problems);
}

export function pageKey(documentName: string, page: number): string {
  return JSON.stringify([documentName, page]);
}

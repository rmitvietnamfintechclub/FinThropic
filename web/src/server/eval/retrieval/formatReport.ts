import "server-only";
import type { RetrievalReport } from "./evaluate";
import type { Spread } from "./metrics";

const score = (value: number) => value.toFixed(3);

function spreadLine(label: string, value: Spread | null): string {
  if (!value) return `  ${label.padEnd(10)} none`;
  return `  ${label.padEnd(10)} n=${String(value.count).padEnd(4)} min ${score(value.min)}  median ${score(value.median)}  max ${score(value.max)}`;
}

/** A plain-text summary for the terminal. Ids and numbers only, never question or chunk text. */
export function formatReport(report: RetrievalReport, header: string): string {
  const { ranking, top1 } = report;
  const lines = [
    header,
    `${report.chunkCount} chunks, ${report.questionCount} questions (${ranking.answerableCount} answerable)`,
    "",
    "Ranking (answerable questions; a hit is a chunk on the gold page)",
    ...Object.entries(ranking.recallAt).map(([k, v]) => `  Recall${k.padEnd(4)} ${score(v)}`),
    `  MRR       ${score(ranking.mrr)}`,
    "",
    "Top-1 similarity",
    spreadLine("answerable", top1.answerable),
    spreadLine("no-answer", top1.noAnswer),
    top1.bestCutoff
      ? `  best cutoff ${score(top1.bestCutoff.value)}: ${top1.bestCutoff.misclassified} misclassified ` +
        `(${top1.bestCutoff.answerableBelow} answerable below, ${top1.bestCutoff.noAnswerAtOrAbove} no-answer at or above)`
      : "  best cutoff: needs at least one answerable and one no-answer question",
    "",
    "Per question",
    `  ${"id".padEnd(16)} ${"rank".padStart(5)} ${"top-1".padStart(6)}  top chunk`,
    ...report.questions.map((q) => {
      const rank = q.answerable ? (q.firstHitRank === null ? "miss" : String(q.firstHitRank)) : "-";
      const first = q.top[0];
      return `  ${q.id.padEnd(16)} ${rank.padStart(5)} ${score(q.top1Similarity).padStart(6)}  ${first.documentName} p${first.page}`;
    }),
  ];
  return lines.join("\n");
}

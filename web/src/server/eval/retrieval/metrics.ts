import "server-only";

// Pure retrieval metrics. No I/O, no embedder: easy to test on tiny hand-made inputs.

export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`vector sizes differ: ${a.length} and ${b.length}`);
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / Math.sqrt(normA * normB);
}

/** One question's outcome: the 1-based rank of the first chunk on the gold page, and the top-1 score. */
export interface QuestionOutcome {
  answerable: boolean;
  /** null when the question has no gold page, or no ranked chunk is on it. */
  firstHitRank: number | null;
  top1Similarity: number;
}

export interface RankingMetrics {
  answerableCount: number;
  recallAt: Record<string, number>;
  mrr: number;
}

/** Recall@k and MRR over answerable questions. A miss adds 0 to MRR. */
export function rankingMetrics(
  outcomes: QuestionOutcome[],
  recallAt: readonly number[],
): RankingMetrics {
  const answerable = outcomes.filter((outcome) => outcome.answerable);
  const count = answerable.length;
  const share = (hits: number) => (count === 0 ? 0 : hits / count);
  const recall: Record<string, number> = {};
  for (const k of recallAt) {
    recall[`@${k}`] = share(
      answerable.filter((o) => o.firstHitRank !== null && o.firstHitRank <= k).length,
    );
  }
  const reciprocal = answerable.reduce(
    (sum, o) => sum + (o.firstHitRank === null ? 0 : 1 / o.firstHitRank),
    0,
  );
  return { answerableCount: count, recallAt: recall, mrr: share(reciprocal) };
}

export interface Spread {
  count: number;
  min: number;
  median: number;
  max: number;
}

export function spread(values: number[]): Spread | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return { count: sorted.length, min: sorted[0], median, max: sorted[sorted.length - 1] };
}

export interface Cutoff {
  /** Answer when the top-1 similarity is at least this value; otherwise give the fallback. */
  value: number;
  misclassified: number;
  /** Answerable questions whose top-1 similarity falls below the cutoff (wrong fallback). */
  answerableBelow: number;
  /** No-answer questions whose top-1 similarity reaches the cutoff (would get an answer). */
  noAnswerAtOrAbove: number;
}

/**
 * The cutoff on top-1 similarity that misclassifies the fewest questions. Candidates are the
 * midpoints between neighbouring scores, plus one below and one above all scores. On a tie the
 * lowest cutoff wins (it lets more questions through to the model). null when a group is empty.
 */
export function bestCutoff(answerable: number[], noAnswer: number[]): Cutoff | null {
  if (answerable.length === 0 || noAnswer.length === 0) return null;
  const scores = [...new Set([...answerable, ...noAnswer])].sort((a, b) => a - b);
  const candidates = [scores[0] - 1e-6];
  for (let i = 1; i < scores.length; i++) candidates.push((scores[i - 1] + scores[i]) / 2);
  candidates.push(scores[scores.length - 1] + 1e-6);

  let best: Cutoff | null = null;
  for (const value of candidates) {
    const answerableBelow = answerable.filter((score) => score < value).length;
    const noAnswerAtOrAbove = noAnswer.filter((score) => score >= value).length;
    const misclassified = answerableBelow + noAnswerAtOrAbove;
    if (best === null || misclassified < best.misclassified) {
      best = { value, misclassified, answerableBelow, noAnswerAtOrAbove };
    }
  }
  return best;
}

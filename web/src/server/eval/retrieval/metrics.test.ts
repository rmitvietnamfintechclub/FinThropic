import { describe, expect, it } from "vitest";
import { bestCutoff, cosine, rankingMetrics, spread, type QuestionOutcome } from "./metrics";

const answerable = (firstHitRank: number | null): QuestionOutcome => ({
  answerable: true,
  firstHitRank,
  top1Similarity: 0.5,
});
const noAnswer: QuestionOutcome = { answerable: false, firstHitRank: null, top1Similarity: 0.1 };

describe("cosine", () => {
  it("is 1 for the same direction, 0 for orthogonal, -1 for opposite", () => {
    expect(cosine([1, 2], [2, 4])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 3])).toBe(0);
    expect(cosine([1, 1], [-1, -1])).toBeCloseTo(-1);
  });

  it("is 0 for a zero vector and refuses vectors of different sizes", () => {
    expect(cosine([0, 0], [1, 1])).toBe(0);
    expect(() => cosine([1], [1, 2])).toThrow("vector sizes differ: 1 and 2");
  });
});

describe("rankingMetrics", () => {
  it("computes Recall@k and MRR over answerable questions only", () => {
    // Ranks 1, 2, 6 and a miss; the no-answer question is ignored.
    const outcomes = [answerable(1), answerable(2), answerable(6), answerable(null), noAnswer];
    const metrics = rankingMetrics(outcomes, [1, 5]);
    expect(metrics.answerableCount).toBe(4);
    expect(metrics.recallAt).toEqual({ "@1": 0.25, "@5": 0.5 });
    expect(metrics.mrr).toBeCloseTo((1 + 1 / 2 + 1 / 6 + 0) / 4);
  });

  it("is zero, not NaN, with no answerable question", () => {
    expect(rankingMetrics([noAnswer], [1])).toEqual({
      answerableCount: 0,
      recallAt: { "@1": 0 },
      mrr: 0,
    });
  });
});

describe("spread", () => {
  it("gives min, median and max for odd and even counts", () => {
    expect(spread([0.3, 0.1, 0.2])).toEqual({ count: 3, min: 0.1, median: 0.2, max: 0.3 });
    expect(spread([0.4, 0.1, 0.2, 0.3])).toEqual({ count: 4, min: 0.1, median: 0.25, max: 0.4 });
    expect(spread([])).toBeNull();
  });
});

describe("bestCutoff", () => {
  it("separates two groups that do not overlap with zero errors", () => {
    const cutoff = bestCutoff([0.7, 0.8, 0.9], [0.2, 0.3, 0.5]);
    expect(cutoff?.value).toBeCloseTo(0.6);
    expect(cutoff).toMatchObject({ misclassified: 0, answerableBelow: 0, noAnswerAtOrAbove: 0 });
  });

  it("counts the errors on each side when the groups overlap", () => {
    // Every cutoff misclassifies at least one: 0.35 lets the 0.6 no-answer through, 0.65 rejects the
    // 0.5 answerable. The lower one wins the tie.
    const cutoff = bestCutoff([0.5, 0.7, 0.8], [0.2, 0.6]);
    expect(cutoff?.misclassified).toBe(1);
    expect(cutoff?.value).toBeCloseTo(0.35);
    expect(cutoff).toMatchObject({ answerableBelow: 0, noAnswerAtOrAbove: 1 });
  });

  it("picks the lowest cutoff on a tie", () => {
    // 0.3 (accepts the 0.5 no-answer) and 0.7 (rejects the 0.5 answerable) both make one error.
    expect(bestCutoff([0.5, 0.9], [0.1, 0.5])?.value).toBeCloseTo(0.3);
  });

  it("works when every no-answer score is above every answerable score", () => {
    const cutoff = bestCutoff([0.1, 0.2], [0.8, 0.9]);
    expect(cutoff?.misclassified).toBe(2);
  });

  it("needs both groups", () => {
    expect(bestCutoff([0.5], [])).toBeNull();
    expect(bestCutoff([], [0.5])).toBeNull();
  });
});

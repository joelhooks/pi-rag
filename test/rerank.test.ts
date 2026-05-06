import { describe, expect, test } from "bun:test";
import { bm25Score, rerankCandidates } from "../src/core/rerank.js";

describe("reranking", () => {
  test("BM25 rewards relevant terms", () => {
    const scores = bm25Score("better auth oauth", ["pricing bundle cohort", "better auth oauth migration session"]);
    expect(scores[1]!).toBeGreaterThan(scores[0]!);
  });

  test("rerank blends BM25, Typesense, exact, project hints", () => {
    const ranked = rerankCandidates([
      { id: "a", title: "pricing", score: 999, highlights: ["bundle pricing"], trace: [] },
      { id: "b", title: "Better Auth migration", score: 10, highlights: ["better auth oauth migration in course-builder"], trace: [] },
    ], { query: "Better Auth OAuth migration", projectHints: ["course-builder"] });
    expect(ranked[0]!.id).toBe("b");
    expect(ranked[0]!.rerank.reasons.join(" ")).toContain("BM25");
  });
});

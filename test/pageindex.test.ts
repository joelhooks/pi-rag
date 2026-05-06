import { describe, expect, test } from "bun:test";
import { buildCorpusTree, treeSearch } from "../src/core/pageindex.js";
import { buildStructure } from "../src/core/structure.js";
import type { SessionDocument } from "../src/core/types.js";

const doc: SessionDocument = {
  id: "s2",
  title: "Auth migration",
  messages: [
    { id: "0", role: "user", content: "We should migrate NextAuth to Better Auth for Epic Web" },
    { id: "1", role: "assistant", content: "Better Auth migration requires schema and adapter checks" },
    { id: "2", role: "user", content: "Unrelated note about cohort pricing" },
    { id: "3", role: "assistant", content: "Testing bundle pricing should stay around 500" },
    { id: "4", role: "user", content: "OAuth callbacks and session token expiry matter for Better Auth" },
  ],
};

describe("PageIndex-style retrieval", () => {
  test("tree search selects relevant nodes", () => {
    const structure = buildStructure(doc, { windowSize: 2, childWindowSize: 1 });
    const result = treeSearch(structure, doc, "Better Auth OAuth session migration", { fanout: 2, maxDepth: 3 });
    expect(result.selected[0]!.score).toBeGreaterThan(0);
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.trace.join(" ")).toContain("PageIndex-style");
  });

  test("corpus tree groups candidate sessions", () => {
    const corpus = buildCorpusTree([{ id: "a", title: "A", source: "course-builder" }, { id: "b", title: "B", source: "joelclaw" }]);
    expect(corpus.children!.length).toBe(2);
    expect(corpus.sessionIds).toEqual(["a", "b"]);
  });
});

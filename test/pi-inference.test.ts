import { describe, expect, test } from "bun:test";
import { HeuristicSummarizer } from "../src/core/pi-inference.js";
import { buildStructure } from "../src/core/structure.js";
import type { SessionDocument } from "../src/core/types.js";

describe("summarizers", () => {
  test("heuristic summarizer returns keywords without LLM", async () => {
    const doc: SessionDocument = { id: "s", messages: [{ id: "0", role: "user", content: "PageIndex retrieval uses hierarchical memory retrieval" }] };
    const structure = buildStructure(doc);
    const summary = await new HeuristicSummarizer().summarizeNode(doc.messages, structure.root, doc);
    expect(summary.keywords).toContain("pageindex");
    expect(summary.trace[0]).toContain("heuristic");
  });
});

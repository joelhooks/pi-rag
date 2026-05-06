import { describe, expect, test } from "bun:test";
import { buildStructure, getBoundedContent } from "../src/core/structure.js";
import type { SessionDocument } from "../src/core/types.js";

const doc: SessionDocument = { id: "s1", title: "Test", messages: Array.from({ length: 15 }, (_, i) => ({ id: String(i), role: i % 2 ? "assistant" : "user", content: `${i === 7 ? "New topic: " : ""}Message ${i} about agents and memory`, createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString() })) };

describe("structure", () => {
  test("builds deterministic hierarchy", () => {
    const s = buildStructure(doc, { windowSize: 6, childWindowSize: 2 });
    expect(s.root.children!.length).toBeGreaterThan(1);
    expect(s.root.children![0]!.start).toBe(0);
    expect(s.root.children![0]!.children!.length).toBeGreaterThan(1);
    expect(s.trace.join(" ")).toContain("deterministic");
  });

  test("retrieves bounded content by node", () => {
    const s = buildStructure(doc, { windowSize: 6, childWindowSize: 2 });
    const slice = getBoundedContent(doc, s, { nodeId: "n1.1" });
    expect(slice.messages.length).toBeLessThanOrEqual(2);
    expect(slice.trace.join(" ")).toContain("node n1.1");
  });

  test("refuses large dumps", () => {
    const s = buildStructure(doc);
    expect(() => getBoundedContent({ ...doc, messages: Array.from({ length: 100 }, (_, i) => ({ id: String(i), role: "user", content: "x" })) }, { ...s, messageCount: 100 }, { start: 0, end: 99 })).toThrow(/refusing/);
  });
});

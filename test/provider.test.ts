import { describe, expect, test } from "bun:test";
import { InMemorySessionProvider } from "../src/adapters/memory.js";
import { PdfBrainProvider } from "../src/adapters/pdf-brain.js";
import { listProviders } from "../src/core/provider.js";

describe("providers", () => {
  test("typesense provider is registered by adapter index", async () => {
    await import("../src/adapters/index.js");
    expect(listProviders()).toContain("typesense");
  });

  test("in-memory provider implements session provider contract", async () => {
    const p = new InMemorySessionProvider([{ id: "s", title: "LibSQL memory", messages: [{ id: "0", role: "user", content: "libsql adapter works" }] }]);
    const hits = await p.search("libsql", { limit: 1 });
    expect(hits[0]!.id).toBe("s");
    expect((await p.get("s")).messages.length).toBe(1);
  });

  test("pdf-brain provider maps records into session documents", async () => {
    const p = new PdfBrainProvider({
      async search() { return [{ id: "doc1", title: "PDF", page: 3, content: "agent memory from books" }]; },
      async get() { return [{ id: "doc1", title: "PDF", page: 3, content: "page text" }, { id: "doc1", title: "PDF", page: 4, content: "next page" }]; },
    });
    expect((await p.search("agent"))[0]!.trace.join(" ")).toContain("pdf-brain");
    expect((await p.get("doc1")).messages.length).toBe(2);
  });
});

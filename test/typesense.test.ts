import { describe, expect, test } from "bun:test";
import { TypesenseSessionStore, normalizeDocument } from "../src/adapters/typesense.js";

describe("typesense adapter", () => {
  test("normalizes session documents", () => {
    const doc = normalizeDocument({ id: "a", title: "A", messages: [{ role: "user", text: "hello" }] });
    expect(doc.messages[0]!.content).toBe("hello");
  });

  test("search uses injected fetch", async () => {
    const calls: string[] = [];
    const fetcher = async (input: string | URL | Request) => { calls.push(String(input)); return new Response(JSON.stringify({ hits: [{ text_match: 42, document: { id: "s1", title: "Session" }, highlights: [{ snippet: "hit" }] }] }), { status: 200 }); };
    const store = new TypesenseSessionStore({ host: "http://typesense", apiKey: "x", collection: "sessions", queryBy: "title,content" }, fetcher);
    const result = await store.search("memory", 3);
    expect(calls[0]).toContain("collections/sessions/documents/search");
    expect(result[0]!.id).toBe("s1");
    expect(result[0]!.trace.join(" ")).toContain("Typesense");
  });

  test("get uses injected fetch", async () => {
    const fetcher = async () => new Response(JSON.stringify({ id: "s1", messages: "one\n\ntwo" }), { status: 200 });
    const store = new TypesenseSessionStore({ host: "http://typesense", apiKey: "x", collection: "sessions", queryBy: "title" }, fetcher);
    const doc = await store.get("s1");
    expect(doc.messages.length).toBe(2);
  });
});

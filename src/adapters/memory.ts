import type { CandidateSession, SessionDocument } from "../core/types.js";
import type { SearchOptions, SessionProvider } from "../core/provider.js";
import { rerankCandidates } from "../core/rerank.js";

export class InMemorySessionProvider implements SessionProvider {
  readonly name = "memory";
  constructor(private docs: SessionDocument[]) {}

  async search(query: string, options: SearchOptions = {}): Promise<CandidateSession[]> {
    const q = query.toLowerCase();
    const candidates = this.docs.map((d) => {
      const text = [d.title, d.source, ...d.messages.map((m) => m.content)].join("\n");
      const hit = text.toLowerCase().includes(q) ? 100 : 0;
      return { id: d.id, title: d.title, createdAt: d.createdAt, updatedAt: d.updatedAt, highlights: [text.slice(0, 500)], score: hit, trace: ["in-memory provider"] } satisfies CandidateSession;
    }).filter((c) => c.score || !query.trim()).slice(0, Math.max(options.limit ?? 8, (options.limit ?? 8) * 4));
    const ranked = options.rerank === false ? candidates : rerankCandidates(candidates, { query, projectHints: options.projectHints });
    return ranked.slice(0, options.limit ?? 8);
  }

  async get(id: string): Promise<SessionDocument> {
    const doc = this.docs.find((d) => d.id === id);
    if (!doc) throw new Error(`session not found: ${id}`);
    return doc;
  }
}

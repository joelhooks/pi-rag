import type { CandidateSession, SessionDocument, SessionMessage } from "../core/types.js";
import type { SearchOptions, SessionProvider } from "../core/provider.js";
import { rerankCandidates } from "../core/rerank.js";

export interface PdfBrainRecord {
  id: string;
  title?: string;
  source?: string;
  page?: number;
  section?: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface PdfBrainSearchPort {
  search(query: string, options?: { limit?: number; filter?: string }): Promise<PdfBrainRecord[]>;
  get(id: string): Promise<PdfBrainRecord | PdfBrainRecord[]>;
}

export class PdfBrainProvider implements SessionProvider {
  readonly name = "pdf-brain";
  constructor(private port: PdfBrainSearchPort) {}

  async search(query: string, options: SearchOptions = {}): Promise<CandidateSession[]> {
    const records = await this.port.search(query, { limit: Math.max(options.limit ?? 8, (options.limit ?? 8) * 4), filter: options.filterBy });
    const candidates: CandidateSession[] = records.map((r) => ({ id: r.id, title: r.title || r.section || r.id, source: r.source, highlights: [r.content.slice(0, 700)], trace: [`pdf-brain provider`, r.page ? `page ${r.page}` : "page n/a"] }));
    return (options.rerank === false ? candidates : rerankCandidates(candidates, { query, projectHints: options.projectHints })).slice(0, options.limit ?? 8);
  }

  async get(id: string): Promise<SessionDocument> {
    const result = await this.port.get(id);
    const records = Array.isArray(result) ? result : [result];
    const first = records[0];
    if (!first) throw new Error(`pdf-brain record not found: ${id}`);
    const messages: SessionMessage[] = records.map((r, i) => ({ id: `${r.id}:${r.page ?? i}`, role: "document", content: r.content, metadata: { page: r.page, section: r.section, ...r.metadata } }));
    return { id, title: first.title || first.section || id, source: first.source || "pdf-brain", messages, metadata: { provider: "pdf-brain", recordCount: records.length } };
  }
}

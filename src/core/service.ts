import "../adapters/index.js";
import { FileStructureCache } from "./cache.js";
import { createProvider, type SearchOptions, type SessionProvider } from "./provider.js";
import { buildCorpusTree, treeSearch } from "./pageindex.js";
import { HeuristicSummarizer, PiCliSummarizer } from "./pi-inference.js";
import { rerankCandidates } from "./rerank.js";
import { buildStructure, findNode, getBoundedContent } from "./structure.js";
import type { CandidateSession, SessionDocument } from "./types.js";

export class PiRagService {
  constructor(private store: SessionProvider = createProvider(), private cache = new FileStructureCache()) {}

  async searchSessions(query: string, limit?: number, options: SearchOptions = {}) {
    // Pull extra candidates when reranking. Provider gets broad recall; local rerank corrects for our session/project needs.
    const rawLimit = options.rerank === false ? limit : Math.max(limit ?? 8, Math.min(50, (limit ?? 8) * 4));
    const candidates = await this.store.search(query, { ...options, limit: rawLimit });
    if (options.rerank === false) return candidates.slice(0, limit ?? 8);
    return rerankCandidates(candidates, { query, projectHints: options.projectHints }).slice(0, limit ?? 8);
  }
  getSession(id: string) { return this.store.get(id); }

  async getStructure(id: string, refresh = false) {
    if (!refresh) { const cached = await this.cache.get(id); if (cached) return { ...cached, trace: [...cached.trace, "loaded from local structure cache"] }; }
    const doc = await this.store.get(id);
    const structure = buildStructure(doc);
    await this.cache.set(id, structure);
    return structure;
  }

  async getContent(id: string, input: { nodeId?: string; start?: number; end?: number; allowLarge?: boolean }) {
    const doc: SessionDocument = await this.store.get(id);
    const structure = await this.getStructure(id);
    return getBoundedContent(doc, structure, input);
  }

  async searchTree(id: string, query: string, opts: { fanout?: number; maxDepth?: number } = {}) {
    const doc = await this.store.get(id);
    const structure = await this.getStructure(id);
    return treeSearch(structure, doc, query, opts);
  }

  async summarizeNode(id: string, nodeId: string, opts: { usePi?: boolean } = {}) {
    const doc = await this.store.get(id);
    const structure = await this.getStructure(id);
    const node = findNode(structure, nodeId);
    if (!node) throw new Error(`node not found: ${nodeId}`);
    const messages = doc.messages.slice(node.start, node.end + 1);
    const summarizer = opts.usePi ? new PiCliSummarizer() : new HeuristicSummarizer();
    return summarizer.summarizeNode(messages, node, doc);
  }

  corpusTree(candidates: CandidateSession[]) {
    return buildCorpusTree(candidates.map((c) => ({ id: c.id, title: c.title, createdAt: c.createdAt, metadata: { score: c.score, highlights: c.highlights } })));
  }
}

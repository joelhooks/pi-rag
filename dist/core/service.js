import { TypesenseSessionStore } from "../adapters/typesense.js";
import { FileStructureCache } from "./cache.js";
import { buildCorpusTree, treeSearch } from "./pageindex.js";
import { HeuristicSummarizer, PiCliSummarizer } from "./pi-inference.js";
import { rerankCandidates } from "./rerank.js";
import { buildStructure, findNode, getBoundedContent } from "./structure.js";
export class PiRagService {
    store;
    cache;
    constructor(store = new TypesenseSessionStore(), cache = new FileStructureCache()) {
        this.store = store;
        this.cache = cache;
    }
    async searchSessions(query, limit, options = {}) {
        // Pull extra candidates when reranking. Typesense/BM25 gets broad recall; local rerank corrects for our session/project needs.
        const rawLimit = options.rerank ? Math.max(limit ?? 8, Math.min(50, (limit ?? 8) * 4)) : limit;
        const candidates = await this.store.search(query, rawLimit, { filterBy: options.filterBy, sortBy: options.sortBy, preset: options.preset });
        if (!options.rerank)
            return candidates;
        return rerankCandidates(candidates, { query, projectHints: options.projectHints }).slice(0, limit ?? 8);
    }
    getSession(id) { return this.store.get(id); }
    async getStructure(id, refresh = false) {
        if (!refresh) {
            const cached = await this.cache.get(id);
            if (cached)
                return { ...cached, trace: [...cached.trace, "loaded from local structure cache"] };
        }
        const doc = await this.store.get(id);
        const structure = buildStructure(doc);
        await this.cache.set(id, structure);
        return structure;
    }
    async getContent(id, input) {
        const doc = await this.store.get(id);
        const structure = await this.getStructure(id);
        return getBoundedContent(doc, structure, input);
    }
    async searchTree(id, query, opts = {}) {
        const doc = await this.store.get(id);
        const structure = await this.getStructure(id);
        return treeSearch(structure, doc, query, opts);
    }
    async summarizeNode(id, nodeId, opts = {}) {
        const doc = await this.store.get(id);
        const structure = await this.getStructure(id);
        const node = findNode(structure, nodeId);
        if (!node)
            throw new Error(`node not found: ${nodeId}`);
        const messages = doc.messages.slice(node.start, node.end + 1);
        const summarizer = opts.usePi ? new PiCliSummarizer() : new HeuristicSummarizer();
        return summarizer.summarizeNode(messages, node, doc);
    }
    corpusTree(candidates) {
        return buildCorpusTree(candidates.map((c) => ({ id: c.id, title: c.title, createdAt: c.createdAt, metadata: { score: c.score, highlights: c.highlights } })));
    }
}

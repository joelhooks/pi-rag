import { rerankCandidates } from "../core/rerank.js";
export class PdfBrainProvider {
    port;
    name = "pdf-brain";
    constructor(port) {
        this.port = port;
    }
    async search(query, options = {}) {
        const records = await this.port.search(query, { limit: Math.max(options.limit ?? 8, (options.limit ?? 8) * 4), filter: options.filterBy });
        const candidates = records.map((r) => ({ id: r.id, title: r.title || r.section || r.id, source: r.source, highlights: [r.content.slice(0, 700)], trace: [`pdf-brain provider`, r.page ? `page ${r.page}` : "page n/a"] }));
        return (options.rerank === false ? candidates : rerankCandidates(candidates, { query, projectHints: options.projectHints })).slice(0, options.limit ?? 8);
    }
    async get(id) {
        const result = await this.port.get(id);
        const records = Array.isArray(result) ? result : [result];
        const first = records[0];
        if (!first)
            throw new Error(`pdf-brain record not found: ${id}`);
        const messages = records.map((r, i) => ({ id: `${r.id}:${r.page ?? i}`, role: "document", content: r.content, metadata: { page: r.page, section: r.section, ...r.metadata } }));
        return { id, title: first.title || first.section || id, source: first.source || "pdf-brain", messages, metadata: { provider: "pdf-brain", recordCount: records.length } };
    }
}

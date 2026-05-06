import { TypesenseSessionStore } from "../adapters/typesense.js";
import { FileStructureCache } from "./cache.js";
import { buildStructure, getBoundedContent } from "./structure.js";
export class PiRagService {
    store;
    cache;
    constructor(store = new TypesenseSessionStore(), cache = new FileStructureCache()) {
        this.store = store;
        this.cache = cache;
    }
    searchSessions(query, limit) { return this.store.search(query, limit); }
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
}

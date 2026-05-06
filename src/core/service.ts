import { TypesenseSessionStore } from "../adapters/typesense.js";
import { FileStructureCache } from "./cache.js";
import { buildStructure, getBoundedContent } from "./structure.js";
import type { SessionDocument } from "./types.js";

export class PiRagService {
  constructor(private store = new TypesenseSessionStore(), private cache = new FileStructureCache()) {}
  searchSessions(query: string, limit?: number) { return this.store.search(query, limit); }
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
}

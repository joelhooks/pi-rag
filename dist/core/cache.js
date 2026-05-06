import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
export class FileStructureCache {
    dir;
    constructor(dir = process.env.PI_RAG_CACHE_DIR || ".pi-rag/cache") {
        this.dir = dir;
    }
    path(sessionId) { return join(this.dir, `${encodeURIComponent(sessionId)}.structure.json`); }
    async get(sessionId) {
        try {
            return JSON.parse(await readFile(this.path(sessionId), "utf8"));
        }
        catch {
            return undefined;
        }
    }
    async set(sessionId, structure) {
        await mkdir(this.dir, { recursive: true });
        await writeFile(this.path(sessionId), JSON.stringify(structure, null, 2));
    }
}

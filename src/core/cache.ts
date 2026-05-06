import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SessionStructure } from "./types.js";

export class FileStructureCache {
  constructor(private dir = process.env.PI_RAG_CACHE_DIR || ".pi-rag/cache") {}
  private path(sessionId: string) { return join(this.dir, `${encodeURIComponent(sessionId)}.structure.json`); }
  async get(sessionId: string): Promise<SessionStructure | undefined> {
    try { return JSON.parse(await readFile(this.path(sessionId), "utf8")) as SessionStructure; } catch { return undefined; }
  }
  async set(sessionId: string, structure: SessionStructure): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.path(sessionId), JSON.stringify(structure, null, 2));
  }
}

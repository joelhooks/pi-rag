import type { SessionStructure } from "./types.js";
export declare class FileStructureCache {
    private dir;
    constructor(dir?: string);
    private path;
    get(sessionId: string): Promise<SessionStructure | undefined>;
    set(sessionId: string, structure: SessionStructure): Promise<void>;
}

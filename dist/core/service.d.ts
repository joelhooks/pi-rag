import { TypesenseSessionStore } from "../adapters/typesense.js";
import { FileStructureCache } from "./cache.js";
import type { SessionDocument } from "./types.js";
export declare class PiRagService {
    private store;
    private cache;
    constructor(store?: TypesenseSessionStore, cache?: FileStructureCache);
    searchSessions(query: string, limit?: number): Promise<import("./types.js").CandidateSession[]>;
    getSession(id: string): Promise<SessionDocument>;
    getStructure(id: string, refresh?: boolean): Promise<import("./types.js").SessionStructure>;
    getContent(id: string, input: {
        nodeId?: string;
        start?: number;
        end?: number;
        allowLarge?: boolean;
    }): Promise<import("./types.js").ContentSlice>;
}

import "../adapters/index.js";
import { FileStructureCache } from "./cache.js";
import { type SearchOptions, type SessionProvider } from "./provider.js";
import type { CandidateSession, SessionDocument } from "./types.js";
export declare class PiRagService {
    private store;
    private cache;
    constructor(store?: SessionProvider, cache?: FileStructureCache);
    searchSessions(query: string, limit?: number, options?: SearchOptions): Promise<CandidateSession[]>;
    getSession(id: string): Promise<SessionDocument>;
    getStructure(id: string, refresh?: boolean): Promise<import("./types.js").SessionStructure>;
    getContent(id: string, input: {
        nodeId?: string;
        start?: number;
        end?: number;
        allowLarge?: boolean;
    }): Promise<import("./types.js").ContentSlice>;
    searchTree(id: string, query: string, opts?: {
        fanout?: number;
        maxDepth?: number;
    }): Promise<import("./pageindex.js").TreeSearchResult>;
    summarizeNode(id: string, nodeId: string, opts?: {
        usePi?: boolean;
    }): Promise<import("./pi-inference.js").NodeSummary>;
    corpusTree(candidates: CandidateSession[]): import("./pageindex.js").CorpusNode;
}

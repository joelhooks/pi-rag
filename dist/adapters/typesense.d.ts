import type { CandidateSession, SessionDocument } from "../core/types.js";
export interface TypesenseConfig {
    host: string;
    apiKey: string;
    collection: string;
    queryBy: string;
    idField?: string;
    titleField?: string;
    messagesField?: string;
    preset?: string;
    sortBy?: string;
    filterBy?: string;
    prefix?: string;
    exhaustiveSearch?: boolean;
}
export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
export declare function configFromEnv(env?: Record<string, string | undefined>): TypesenseConfig;
export declare class TypesenseSessionStore {
    private cfg;
    private fetcher;
    constructor(cfg?: TypesenseConfig, fetcher?: FetchLike);
    search(query: string, limit?: number, options?: {
        filterBy?: string;
        sortBy?: string;
        preset?: string;
        prefix?: string;
        exhaustiveSearch?: boolean;
    }): Promise<CandidateSession[]>;
    get(id: string): Promise<SessionDocument>;
}
export declare function normalizeDocument(raw: any, cfg?: Partial<TypesenseConfig>): SessionDocument;

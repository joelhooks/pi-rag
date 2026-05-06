import type { CandidateSession, SessionDocument } from "./types.js";
export interface SearchOptions {
    limit?: number;
    filterBy?: string;
    sortBy?: string;
    preset?: string;
    projectHints?: string[];
    rerank?: boolean;
    corpusTree?: boolean;
}
export interface SessionProvider {
    readonly name: string;
    search(query: string, options?: SearchOptions): Promise<CandidateSession[]>;
    get(id: string): Promise<SessionDocument>;
}
export interface ProviderFactoryContext {
    env: Record<string, string | undefined>;
    fetch?: typeof fetch;
}
export type ProviderFactory = (ctx: ProviderFactoryContext) => SessionProvider;
export declare function registerProvider(name: string, factory: ProviderFactory): void;
export declare function listProviders(): string[];
export declare function createProvider(name?: string, ctx?: ProviderFactoryContext): SessionProvider;

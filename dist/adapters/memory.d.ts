import type { CandidateSession, SessionDocument } from "../core/types.js";
import type { SearchOptions, SessionProvider } from "../core/provider.js";
export declare class InMemorySessionProvider implements SessionProvider {
    private docs;
    readonly name = "memory";
    constructor(docs: SessionDocument[]);
    search(query: string, options?: SearchOptions): Promise<CandidateSession[]>;
    get(id: string): Promise<SessionDocument>;
}

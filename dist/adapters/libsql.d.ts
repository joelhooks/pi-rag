import type { CandidateSession, SessionDocument } from "../core/types.js";
import type { SearchOptions, SessionProvider } from "../core/provider.js";
type QueryResult = {
    rows: any[];
};
type LibSqlClient = {
    execute: (args: {
        sql: string;
        args?: any[];
    } | string) => Promise<QueryResult>;
};
export interface LibSqlProviderOptions {
    client: LibSqlClient;
    sessionsTable?: string;
    messagesTable?: string;
}
export declare class LibSqlSessionProvider implements SessionProvider {
    private opts;
    readonly name = "libsql";
    private sessionsTable;
    private messagesTable;
    constructor(opts: LibSqlProviderOptions);
    search(query: string, options?: SearchOptions): Promise<CandidateSession[]>;
    get(id: string): Promise<SessionDocument>;
}
export {};

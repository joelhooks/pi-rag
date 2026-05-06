import type { CandidateSession, SessionDocument } from "../core/types.js";
import type { SearchOptions, SessionProvider } from "../core/provider.js";
export interface PdfBrainRecord {
    id: string;
    title?: string;
    source?: string;
    page?: number;
    section?: string;
    content: string;
    metadata?: Record<string, unknown>;
}
export interface PdfBrainSearchPort {
    search(query: string, options?: {
        limit?: number;
        filter?: string;
    }): Promise<PdfBrainRecord[]>;
    get(id: string): Promise<PdfBrainRecord | PdfBrainRecord[]>;
}
export declare class PdfBrainProvider implements SessionProvider {
    private port;
    readonly name = "pdf-brain";
    constructor(port: PdfBrainSearchPort);
    search(query: string, options?: SearchOptions): Promise<CandidateSession[]>;
    get(id: string): Promise<SessionDocument>;
}

import type { CandidateSession, SessionDocument } from "./types.js";
export interface RerankWeights {
    bm25?: number;
    typesense?: number;
    recency?: number;
    exact?: number;
    project?: number;
}
export interface RerankOptions {
    query: string;
    now?: number;
    projectHints?: string[];
    weights?: RerankWeights;
}
export interface RerankedCandidate extends CandidateSession {
    rerankScore: number;
    rerank: {
        bm25: number;
        typesense: number;
        recency: number;
        exact: number;
        project: number;
        weights: Required<RerankWeights>;
        reasons: string[];
    };
}
export declare function bm25Score(query: string, docs: string[]): number[];
export declare function rerankCandidates(candidates: CandidateSession[], opts: RerankOptions): RerankedCandidate[];
export declare function rerankDocuments(docs: SessionDocument[], opts: RerankOptions): RerankedCandidate[];

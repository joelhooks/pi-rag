import type { RagNode, SessionDocument, SessionMessage, SessionStructure } from "./types.js";
export interface StructureBuilderOptions {
    maxMessagesPerLeaf?: number;
    maxChildrenPerNode?: number;
    topicShiftThreshold?: number;
}
export interface StructureBuilder {
    build(doc: SessionDocument, opts?: StructureBuilderOptions): Promise<SessionStructure> | SessionStructure;
}
export interface NodeScorer {
    score(query: string, node: RagNode, messages: SessionMessage[]): NodeScore;
}
export interface NodeScore {
    nodeId: string;
    score: number;
    reasons: string[];
}
export declare function terms(text: string): string[];
export declare function termVector(text: string): Map<string, number>;
export declare function cosine(a: Map<string, number>, b: Map<string, number>): number;
export declare function collectNodes(root: RagNode): RagNode[];
export declare class LexicalNodeScorer implements NodeScorer {
    score(query: string, node: RagNode, messages: SessionMessage[]): NodeScore;
}
export interface TreeSearchStep {
    depth: number;
    inspectedNodeId: string;
    selectedChildIds: string[];
    scores: NodeScore[];
    reason: string;
}
export interface TreeSearchResult {
    query: string;
    selected: NodeScore[];
    steps: TreeSearchStep[];
    trace: string[];
}
export declare function treeSearch(structure: SessionStructure, doc: SessionDocument, query: string, opts?: {
    scorer?: NodeScorer;
    fanout?: number;
    maxDepth?: number;
}): TreeSearchResult;
export interface CorpusNode {
    id: string;
    title: string;
    kind: "root" | "project" | "source" | "session";
    sessionIds: string[];
    children?: CorpusNode[];
    trace: string[];
}
export declare function buildCorpusTree(candidates: Array<{
    id: string;
    title?: string;
    source?: string;
    createdAt?: string;
    metadata?: Record<string, unknown>;
}>): CorpusNode;

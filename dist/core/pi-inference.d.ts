import type { RagNode, SessionDocument, SessionMessage } from "./types.js";
export interface NodeSummary {
    title: string;
    summary: string;
    keywords: string[];
    confidence: number;
    trace: string[];
}
export interface Summarizer {
    summarizeNode(messages: SessionMessage[], node: RagNode, doc: SessionDocument): Promise<NodeSummary>;
}
export declare class HeuristicSummarizer implements Summarizer {
    summarizeNode(messages: SessionMessage[], node: RagNode): Promise<NodeSummary>;
}
export declare class PiCliSummarizer implements Summarizer {
    private command;
    constructor(command?: string);
    summarizeNode(messages: SessionMessage[], node: RagNode, doc: SessionDocument): Promise<NodeSummary>;
}

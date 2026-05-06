import type { ContentSlice, RagNode, SessionDocument, SessionStructure } from "./types.js";
export declare function buildStructure(doc: SessionDocument, opts?: {
    windowSize?: number;
    childWindowSize?: number;
}): SessionStructure;
export declare function findNode(structure: SessionStructure, nodeId: string): RagNode | undefined;
export declare function getBoundedContent(doc: SessionDocument, structure: SessionStructure, input: {
    nodeId?: string;
    start?: number;
    end?: number;
    allowLarge?: boolean;
}): ContentSlice;

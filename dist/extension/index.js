import { Type } from "@sinclair/typebox";
import { PiRagService } from "../core/service.js";
function text(details) { return { content: [{ type: "text", text: JSON.stringify(details, null, 2) }], details }; }
export default function piRagExtension(pi) {
    const service = new PiRagService();
    pi.registerTool({
        name: "rag_search_sessions",
        label: "RAG Search Sessions",
        description: "Search Typesense-backed agent session memory for candidate sessions/documents. Returns candidates with trace metadata, not full content.",
        parameters: Type.Object({ query: Type.String(), limit: Type.Optional(Type.Number({ minimum: 1, maximum: 25 })), corpusTree: Type.Optional(Type.Boolean()) }),
        async execute(_id, params) {
            const candidates = await service.searchSessions(params.query, params.limit);
            return text(params.corpusTree ? { candidates, corpusTree: service.corpusTree(candidates) } : candidates);
        },
    });
    pi.registerTool({
        name: "rag_get_session",
        label: "RAG Get Session",
        description: "Get metadata for a session/document and message count. Does not dump full transcript.",
        parameters: Type.Object({ sessionId: Type.String() }),
        async execute(_id, params) {
            const doc = await service.getSession(params.sessionId);
            return text({ id: doc.id, title: doc.title, source: doc.source, createdAt: doc.createdAt, updatedAt: doc.updatedAt, messageCount: doc.messages.length, metadataKeys: Object.keys(doc.metadata || {}).slice(0, 30), trace: ["metadata only; use rag_get_structure then rag_tree_search/rag_get_content for bounded retrieval"] });
        },
    });
    pi.registerTool({
        name: "rag_get_structure",
        label: "RAG Get Structure",
        description: "Build or fetch a PageIndex-style hierarchical outline for a session/document. Use this before fetching content.",
        parameters: Type.Object({ sessionId: Type.String(), refresh: Type.Optional(Type.Boolean()) }),
        async execute(_id, params) { return text(await service.getStructure(params.sessionId, params.refresh)); },
    });
    pi.registerTool({
        name: "rag_tree_search",
        label: "RAG Tree Search",
        description: "Reason over a session structure to select relevant nodes before fetching exact content. PageIndex-style inspect/choose/fetch loop.",
        parameters: Type.Object({ sessionId: Type.String(), query: Type.String(), fanout: Type.Optional(Type.Number({ minimum: 1, maximum: 8 })), maxDepth: Type.Optional(Type.Number({ minimum: 1, maximum: 8 })) }),
        async execute(_id, params) { return text(await service.searchTree(params.sessionId, params.query, { fanout: params.fanout, maxDepth: params.maxDepth })); },
    });
    pi.registerTool({
        name: "rag_get_content",
        label: "RAG Get Content",
        description: "Retrieve exact bounded transcript content by node id or message start/end range. Refuses large full-session dumps by default.",
        parameters: Type.Object({ sessionId: Type.String(), nodeId: Type.Optional(Type.String()), start: Type.Optional(Type.Number({ minimum: 0 })), end: Type.Optional(Type.Number({ minimum: 0 })), allowLarge: Type.Optional(Type.Boolean()) }),
        async execute(_id, params) { return text(await service.getContent(params.sessionId, params)); },
    });
    pi.registerTool({
        name: "rag_summarize_node",
        label: "RAG Summarize Node",
        description: "Summarize one bounded node. Defaults to deterministic heuristic; set usePi=true to call pi CLI for semantic JSON summarization through the approved inference path.",
        parameters: Type.Object({ sessionId: Type.String(), nodeId: Type.String(), usePi: Type.Optional(Type.Boolean()) }),
        async execute(_id, params) { return text(await service.summarizeNode(params.sessionId, params.nodeId, { usePi: params.usePi })); },
    });
}

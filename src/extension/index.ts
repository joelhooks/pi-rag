import { Type } from "@sinclair/typebox";
import { PiRagService } from "../core/service.js";

function text(details: unknown) { return { content: [{ type: "text" as const, text: JSON.stringify(details, null, 2) }], details }; }

type Pi = { registerTool: (tool: any) => void };

export default function piRagExtension(pi: Pi) {
  let service: PiRagService | undefined;
  const getService = () => service ??= new PiRagService();

  pi.registerTool({
    name: "rag_search_sessions",
    label: "RAG Search Sessions",
    description: "Search Typesense-backed agent session memory for candidate sessions/documents. Returns candidates with trace metadata, not full content.",
    parameters: Type.Object({ query: Type.String(), limit: Type.Optional(Type.Number({ minimum: 1, maximum: 25 })), corpusTree: Type.Optional(Type.Boolean()), rerank: Type.Optional(Type.Boolean()), projectHints: Type.Optional(Type.Array(Type.String())), filterBy: Type.Optional(Type.String()), sortBy: Type.Optional(Type.String()), preset: Type.Optional(Type.String()) }),
    async execute(_id: string, params: { query: string; limit?: number; corpusTree?: boolean; rerank?: boolean; projectHints?: string[]; filterBy?: string; sortBy?: string; preset?: string }) {
      const svc = getService();
      const candidates = await svc.searchSessions(params.query, params.limit, { rerank: params.rerank ?? true, projectHints: params.projectHints, filterBy: params.filterBy, sortBy: params.sortBy, preset: params.preset });
      return text(params.corpusTree ? { candidates, corpusTree: svc.corpusTree(candidates) } : candidates);
    },
  });

  pi.registerTool({
    name: "rag_get_session",
    label: "RAG Get Session",
    description: "Get metadata for a session/document and message count. Does not dump full transcript.",
    parameters: Type.Object({ sessionId: Type.String() }),
    async execute(_id: string, params: { sessionId: string }) {
      const doc = await getService().getSession(params.sessionId);
      return text({ id: doc.id, title: doc.title, source: doc.source, createdAt: doc.createdAt, updatedAt: doc.updatedAt, messageCount: doc.messages.length, metadataKeys: Object.keys(doc.metadata || {}).slice(0, 30), trace: ["metadata only; use rag_get_structure then rag_tree_search/rag_get_content for bounded retrieval"] });
    },
  });

  pi.registerTool({
    name: "rag_get_structure",
    label: "RAG Get Structure",
    description: "Build or fetch a PageIndex-style hierarchical outline for a session/document. Use this before fetching content.",
    parameters: Type.Object({ sessionId: Type.String(), refresh: Type.Optional(Type.Boolean()) }),
    async execute(_id: string, params: { sessionId: string; refresh?: boolean }) { return text(await getService().getStructure(params.sessionId, params.refresh)); },
  });

  pi.registerTool({
    name: "rag_tree_search",
    label: "RAG Tree Search",
    description: "Reason over a session structure to select relevant nodes before fetching exact content. PageIndex-style inspect/choose/fetch loop.",
    parameters: Type.Object({ sessionId: Type.String(), query: Type.String(), fanout: Type.Optional(Type.Number({ minimum: 1, maximum: 8 })), maxDepth: Type.Optional(Type.Number({ minimum: 1, maximum: 8 })) }),
    async execute(_id: string, params: { sessionId: string; query: string; fanout?: number; maxDepth?: number }) { return text(await getService().searchTree(params.sessionId, params.query, { fanout: params.fanout, maxDepth: params.maxDepth })); },
  });

  pi.registerTool({
    name: "rag_get_content",
    label: "RAG Get Content",
    description: "Retrieve exact bounded transcript content by node id or message start/end range. Refuses large full-session dumps by default.",
    parameters: Type.Object({ sessionId: Type.String(), nodeId: Type.Optional(Type.String()), start: Type.Optional(Type.Number({ minimum: 0 })), end: Type.Optional(Type.Number({ minimum: 0 })), allowLarge: Type.Optional(Type.Boolean()) }),
    async execute(_id: string, params: { sessionId: string; nodeId?: string; start?: number; end?: number; allowLarge?: boolean }) { return text(await getService().getContent(params.sessionId, params)); },
  });

  pi.registerTool({
    name: "rag_summarize_node",
    label: "RAG Summarize Node",
    description: "Summarize one bounded node. Defaults to deterministic heuristic; set usePi=true to call pi CLI for semantic JSON summarization through the approved inference path.",
    parameters: Type.Object({ sessionId: Type.String(), nodeId: Type.String(), usePi: Type.Optional(Type.Boolean()) }),
    async execute(_id: string, params: { sessionId: string; nodeId: string; usePi?: boolean }) { return text(await getService().summarizeNode(params.sessionId, params.nodeId, { usePi: params.usePi })); },
  });
}

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

const STOP = new Set("the a an and or but if then with from into about this that these those there here have has had was were are for you your our their they them what when where why how can could should would will just like make using used use not all any more less than each over under between above below".split(" "));

export function terms(text: string): string[] {
  return text.toLowerCase().replace(/https?:\/\/\S+/g, " ").replace(/[^a-z0-9_\-\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
}

export function termVector(text: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of terms(text)) m.set(t, (m.get(t) || 0) + 1);
  return m;
}

export function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, aa = 0, bb = 0;
  for (const v of a.values()) aa += v * v;
  for (const v of b.values()) bb += v * v;
  for (const [k, v] of a) dot += v * (b.get(k) || 0);
  return aa && bb ? dot / Math.sqrt(aa * bb) : 0;
}

export function collectNodes(root: RagNode): RagNode[] {
  const out: RagNode[] = [];
  const walk = (n: RagNode) => { out.push(n); for (const c of n.children || []) walk(c); };
  walk(root);
  return out;
}

export class LexicalNodeScorer implements NodeScorer {
  score(query: string, node: RagNode, messages: SessionMessage[]): NodeScore {
    const q = termVector(query);
    const text = [node.title, node.summary, ...messages.slice(node.start, node.end + 1).map((m) => m.content)].join("\n");
    const n = termVector(text);
    const overlap = [...q.keys()].filter((k) => n.has(k));
    const phraseHits = query.toLowerCase().split(/[,.;:\n]/).map((s) => s.trim()).filter((s) => s.length > 8 && text.toLowerCase().includes(s));
    const score = cosine(q, n) + overlap.length * 0.08 + phraseHits.length * 0.25;
    const reasons = [
      overlap.length ? `term overlap: ${overlap.slice(0, 10).join(", ")}` : "no direct term overlap",
      phraseHits.length ? `phrase hits: ${phraseHits.slice(0, 3).join(" | ")}` : "no phrase hit",
      `range ${node.start}-${node.end}`,
    ];
    return { nodeId: node.id, score: Number(score.toFixed(4)), reasons };
  }
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

export function treeSearch(structure: SessionStructure, doc: SessionDocument, query: string, opts: { scorer?: NodeScorer; fanout?: number; maxDepth?: number } = {}): TreeSearchResult {
  const scorer = opts.scorer || new LexicalNodeScorer();
  const fanout = opts.fanout ?? 3;
  const maxDepth = opts.maxDepth ?? 4;
  const steps: TreeSearchStep[] = [];
  let frontier = [structure.root];
  const selected: NodeScore[] = [];
  for (let depth = 0; depth < maxDepth && frontier.length; depth++) {
    const next: RagNode[] = [];
    for (const parent of frontier) {
      const children = parent.children?.length ? parent.children : [parent];
      const scores = children.map((n) => scorer.score(query, n, doc.messages)).sort((a, b) => b.score - a.score);
      const keep = scores.slice(0, fanout);
      selected.push(...keep);
      const keepIds = new Set(keep.map((s) => s.nodeId));
      next.push(...children.filter((n) => keepIds.has(n.id) && n.children?.length));
      steps.push({ depth, inspectedNodeId: parent.id, selectedChildIds: [...keepIds], scores, reason: `selected top ${keep.length} by lexical relevance; fetch content only for final tight nodes` });
    }
    frontier = next;
  }
  const dedup = new Map<string, NodeScore>();
  for (const s of selected) if (!dedup.has(s.nodeId) || dedup.get(s.nodeId)!.score < s.score) dedup.set(s.nodeId, s);
  return { query, selected: [...dedup.values()].sort((a, b) => b.score - a.score).slice(0, fanout * 2), steps, trace: ["PageIndex-style tree search: inspect structure, score nodes, defer exact content fetch", `fanout=${fanout}`, `maxDepth=${maxDepth}`] };
}

export interface CorpusNode {
  id: string;
  title: string;
  kind: "root" | "project" | "source" | "session";
  sessionIds: string[];
  children?: CorpusNode[];
  trace: string[];
}

export function buildCorpusTree(candidates: Array<{ id: string; title?: string; source?: string; createdAt?: string; metadata?: Record<string, unknown> }>): CorpusNode {
  const root: CorpusNode = { id: "corpus", title: "Session corpus", kind: "root", sessionIds: candidates.map((c) => c.id), children: [], trace: [`grouped ${candidates.length} sessions by project/source metadata`] };
  const groups = new Map<string, typeof candidates>();
  for (const c of candidates) {
    const project = String(c.metadata?.project || c.metadata?.repo || c.source || "unknown");
    if (!groups.has(project)) groups.set(project, []);
    groups.get(project)!.push(c);
  }
  for (const [project, docs] of groups) {
    root.children!.push({ id: `project:${project}`, title: project, kind: "project", sessionIds: docs.map((d) => d.id), trace: [`${docs.length} sessions in group ${project}`], children: docs.map((d) => ({ id: `session:${d.id}`, title: d.title || d.id, kind: "session", sessionIds: [d.id], trace: [`candidate session ${d.id}`] })) });
  }
  return root;
}

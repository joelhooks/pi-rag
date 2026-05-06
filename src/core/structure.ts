import type { ContentSlice, RagNode, SessionDocument, SessionMessage, SessionStructure } from "./types.js";

const DEFAULT_WINDOW = 12;
const MAX_INLINE_MESSAGES = 80;

function words(text: string): string[] {
  return text.toLowerCase().replace(/https?:\/\/\S+/g, " ").replace(/[^a-z0-9_\-\s]/g, " ").split(/\s+/).filter((w) => w.length > 3).slice(0, 80);
}

function titleFrom(messages: SessionMessage[], fallback: string): string {
  const firstUser = messages.find((m) => m.role === "user" && m.content.trim());
  const text = (firstUser?.content || messages.find((m) => m.content.trim())?.content || fallback).trim().replace(/\s+/g, " ");
  return text.length > 78 ? `${text.slice(0, 75)}…` : text;
}

function summarize(messages: SessionMessage[]): string {
  const roleCounts = roleMix(messages);
  const top = [...new Set(messages.flatMap((m) => words(m.content)).filter((w) => !["that", "this", "with", "from", "have", "will", "would", "there", "about"].includes(w)))].slice(0, 8);
  return `${messages.length} messages; roles ${Object.entries(roleCounts).map(([r, c]) => `${r}:${c}`).join(", ")}; terms ${top.join(", ") || "n/a"}`;
}

function roleMix(messages: SessionMessage[]): Record<string, number> {
  return messages.reduce<Record<string, number>>((acc, m) => { acc[m.role] = (acc[m.role] || 0) + 1; return acc; }, {});
}

function node(id: string, messages: SessionMessage[], start: number, end: number, trace: string[], children?: RagNode[]): RagNode {
  return { id, title: titleFrom(messages, id), summary: summarize(messages), start, end, roleMix: roleMix(messages), children, trace };
}

function shouldBreak(prev: SessionMessage, curr: SessionMessage, indexInSegment: number, windowSize: number): boolean {
  if (indexInSegment >= windowSize) return true;
  if (prev.createdAt && curr.createdAt) {
    const delta = Date.parse(curr.createdAt) - Date.parse(prev.createdAt);
    if (Number.isFinite(delta) && delta > 1000 * 60 * 45) return true;
  }
  const currText = curr.content.toLowerCase();
  if (/^(new topic|separate|anyway|switching|next|question:)/.test(currText.trim())) return true;
  return false;
}

export function buildStructure(doc: SessionDocument, opts: { windowSize?: number; childWindowSize?: number } = {}): SessionStructure {
  const windowSize = opts.windowSize ?? DEFAULT_WINDOW;
  const childWindowSize = opts.childWindowSize ?? 4;
  const messages = doc.messages;
  const trace = [`deterministic hierarchy built from ${messages.length} messages`, `top-level window size ${windowSize}, child window size ${childWindowSize}`];
  const children: RagNode[] = [];
  let start = 0;
  for (let i = 1; i <= messages.length; i++) {
    const atEnd = i === messages.length;
    const br = !atEnd && shouldBreak(messages[i - 1]!, messages[i]!, i - start, windowSize);
    if (atEnd || br) {
      const end = atEnd ? i - 1 : i - 1;
      const slice = messages.slice(start, end + 1);
      const grandchildren: RagNode[] = [];
      for (let s = start; s <= end; s += childWindowSize) {
        const e = Math.min(end, s + childWindowSize - 1);
        grandchildren.push(node(`n${children.length + 1}.${grandchildren.length + 1}`, messages.slice(s, e + 1), s, e, [`child chunk from message ${s} to ${e}`]));
      }
      children.push(node(`n${children.length + 1}`, slice, start, end, [`segment from message ${start} to ${end}`], grandchildren.length > 1 ? grandchildren : undefined));
      start = i;
    }
  }
  const root = node("root", messages, 0, Math.max(0, messages.length - 1), [`root covers whole session but content retrieval remains bounded`], children);
  return { sessionId: doc.id, generatedAt: new Date().toISOString(), messageCount: messages.length, root, trace };
}

export function findNode(structure: SessionStructure, nodeId: string): RagNode | undefined {
  const stack = [structure.root];
  while (stack.length) {
    const n = stack.shift()!;
    if (n.id === nodeId) return n;
    stack.push(...(n.children || []));
  }
}

export function getBoundedContent(doc: SessionDocument, structure: SessionStructure, input: { nodeId?: string; start?: number; end?: number; allowLarge?: boolean }): ContentSlice {
  let start = input.start;
  let end = input.end;
  const trace: string[] = [];
  if (input.nodeId) {
    const n = findNode(structure, input.nodeId);
    if (!n) throw new Error(`node not found: ${input.nodeId}`);
    start = n.start; end = n.end; trace.push(`range selected from node ${input.nodeId}: ${start}-${end}`);
  }
  if (start == null || end == null) throw new Error("bounded retrieval requires nodeId or explicit start/end");
  if (start < 0 || end < start || end >= doc.messages.length) throw new Error(`invalid range ${start}-${end} for ${doc.messages.length} messages`);
  const count = end - start + 1;
  if (!input.allowLarge && count > MAX_INLINE_MESSAGES) throw new Error(`refusing unbounded/large dump (${count} messages). Use a tighter node/range or allowLarge=true.`);
  trace.push(`returned ${count} messages, preserving exact transcript content`);
  return { sessionId: doc.id, nodeId: input.nodeId, start, end, messages: doc.messages.slice(start, end + 1), trace };
}

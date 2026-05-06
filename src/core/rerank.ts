import type { CandidateSession, SessionDocument } from "./types.js";
import { terms } from "./pageindex.js";

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

const DEFAULT_WEIGHTS: Required<RerankWeights> = { bm25: 1.0, typesense: 0.35, recency: 0.18, exact: 0.35, project: 0.25 };
const K1 = 1.2;
const B = 0.75;

function candidateText(c: CandidateSession): string {
  return [c.title, ...(c.highlights || []), c.id].filter(Boolean).join("\n");
}

function docText(doc: SessionDocument): string {
  return [doc.title, doc.source, doc.messages.map((m) => `${m.role}: ${m.content}`).join("\n")].filter(Boolean).join("\n");
}

export function bm25Score(query: string, docs: string[]): number[] {
  const qTerms = [...new Set(terms(query))];
  const tokenized = docs.map((d) => terms(d));
  const avgdl = tokenized.reduce((a, d) => a + d.length, 0) / Math.max(1, tokenized.length);
  const df = new Map<string, number>();
  for (const qt of qTerms) df.set(qt, tokenized.filter((d) => d.includes(qt)).length);
  return tokenized.map((tokens) => {
    const len = tokens.length || 1;
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    let score = 0;
    for (const qt of qTerms) {
      const f = tf.get(qt) || 0;
      if (!f) continue;
      const n = df.get(qt) || 0;
      const idf = Math.log(1 + (tokenized.length - n + 0.5) / (n + 0.5));
      score += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + B * (len / Math.max(1, avgdl)))));
    }
    return Number(score.toFixed(6));
  });
}

function normalize(values: number[]): number[] {
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  if (max === min) return values.map((v) => (v > 0 ? 1 : 0));
  return values.map((v) => (v - min) / (max - min));
}

function recencyScore(date?: string, now = Date.now()): number {
  if (!date) return 0;
  const t = Date.parse(date);
  if (!Number.isFinite(t)) return 0;
  const days = Math.max(0, (now - t) / 86_400_000);
  return Number(Math.exp(-days / 30).toFixed(4));
}

function exactScore(query: string, text: string): number {
  const lower = text.toLowerCase();
  const quoted = [...query.matchAll(/"([^"]+)"/g)].map((m) => m[1]!.toLowerCase());
  const phrases = quoted.length ? quoted : query.toLowerCase().split(/\s+/).filter((w) => w.length > 6).slice(0, 6);
  const hits = phrases.filter((p) => lower.includes(p)).length;
  return phrases.length ? hits / phrases.length : 0;
}

function projectScore(hints: string[] | undefined, text: string): number {
  if (!hints?.length) return 0;
  const lower = text.toLowerCase();
  const hits = hints.filter((h) => lower.includes(h.toLowerCase())).length;
  return hits / hints.length;
}

export function rerankCandidates(candidates: CandidateSession[], opts: RerankOptions): RerankedCandidate[] {
  const weights = { ...DEFAULT_WEIGHTS, ...(opts.weights || {}) };
  const texts = candidates.map(candidateText);
  const bm25 = normalize(bm25Score(opts.query, texts));
  const tsRaw = normalize(candidates.map((c) => c.score || 0));
  return candidates.map((c, i) => {
    const text = texts[i]!;
    const recency = recencyScore(c.updatedAt || c.createdAt, opts.now);
    const exact = exactScore(opts.query, text);
    const project = projectScore(opts.projectHints, text);
    const score = weights.bm25 * bm25[i]! + weights.typesense * tsRaw[i]! + weights.recency * recency + weights.exact * exact + weights.project * project;
    const reasons = [`BM25=${bm25[i]!.toFixed(3)}`, `Typesense=${tsRaw[i]!.toFixed(3)}`, `recency=${recency.toFixed(3)}`, `exact=${exact.toFixed(3)}`, `project=${project.toFixed(3)}`];
    return { ...c, rerankScore: Number(score.toFixed(6)), rerank: { bm25: bm25[i]!, typesense: tsRaw[i]!, recency, exact, project, weights, reasons }, trace: [...c.trace, `reranked: ${reasons.join(", ")}`] };
  }).sort((a, b) => b.rerankScore - a.rerankScore);
}

export function rerankDocuments(docs: SessionDocument[], opts: RerankOptions) {
  const asCandidates: CandidateSession[] = docs.map((d) => ({ id: d.id, title: d.title, createdAt: d.createdAt, updatedAt: d.updatedAt, highlights: [docText(d).slice(0, 400)], trace: [`document rerank candidate from ${d.messages.length} messages`] }));
  return rerankCandidates(asCandidates, opts);
}

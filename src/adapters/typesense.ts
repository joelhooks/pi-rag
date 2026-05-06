import type { SearchOptions, SessionProvider } from "../core/provider.js";
import type { CandidateSession, SessionDocument, SessionMessage } from "../core/types.js";

export interface TypesenseConfig {
  host: string;
  apiKey: string;
  collection: string;
  queryBy: string;
  idField?: string;
  titleField?: string;
  messagesField?: string;
  preset?: string;
  sortBy?: string;
  filterBy?: string;
  prefix?: string;
  exhaustiveSearch?: boolean;
}

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export function configFromEnv(env: Record<string, string | undefined> = process.env): TypesenseConfig {
  const host = env.TYPESENSE_HOST || env.PI_RAG_TYPESENSE_HOST;
  const apiKey = env.TYPESENSE_API_KEY || env.PI_RAG_TYPESENSE_API_KEY;
  if (!host || !apiKey) throw new Error("Typesense config missing. Set TYPESENSE_HOST and TYPESENSE_API_KEY.");
  return { host: host.replace(/\/$/, ""), apiKey, collection: env.PI_RAG_TYPESENSE_COLLECTION || env.TYPESENSE_COLLECTION || "agent_sessions", queryBy: env.PI_RAG_QUERY_BY || "title,content,summary", idField: env.PI_RAG_ID_FIELD || "id", titleField: env.PI_RAG_TITLE_FIELD || "title", messagesField: env.PI_RAG_MESSAGES_FIELD || "messages", preset: env.PI_RAG_TYPESENSE_PRESET, sortBy: env.PI_RAG_SORT_BY, filterBy: env.PI_RAG_FILTER_BY, prefix: env.PI_RAG_PREFIX, exhaustiveSearch: env.PI_RAG_EXHAUSTIVE_SEARCH === "true" };
}

export class TypesenseSessionStore implements SessionProvider {
  readonly name = "typesense";
  constructor(private cfg: TypesenseConfig = configFromEnv(), private fetcher: FetchLike = fetch) {}

  async search(query: string, limitOrOptions: number | SearchOptions = 8, options: { filterBy?: string; sortBy?: string; preset?: string; prefix?: string; exhaustiveSearch?: boolean; projectHints?: string[]; rerank?: boolean } = {}): Promise<CandidateSession[]> {
    const limit = typeof limitOrOptions === "number" ? limitOrOptions : (limitOrOptions.limit ?? 8);
    const merged = typeof limitOrOptions === "number" ? options : { ...options, ...limitOrOptions };
    const params = new URLSearchParams({ q: query || "*", query_by: this.cfg.queryBy, per_page: String(limit) });
    const filterBy = merged.filterBy || this.cfg.filterBy;
    const sortBy = merged.sortBy || this.cfg.sortBy;
    const preset = merged.preset || this.cfg.preset;
    const prefix = merged.prefix || this.cfg.prefix;
    const exhaustive = merged.exhaustiveSearch ?? this.cfg.exhaustiveSearch;
    if (filterBy) params.set("filter_by", filterBy);
    if (sortBy) params.set("sort_by", sortBy);
    if (preset) params.set("preset", preset);
    if (prefix) params.set("prefix", prefix);
    if (exhaustive != null) params.set("exhaustive_search", exhaustive ? "true" : "false");
    const url = `${this.cfg.host}/collections/${encodeURIComponent(this.cfg.collection)}/documents/search?${params}`;
    const res = await this.fetcher(url, { headers: { "X-TYPESENSE-API-KEY": this.cfg.apiKey } });
    if (!res.ok) throw new Error(`Typesense search failed ${res.status}: ${await res.text()}`);
    const json: any = await res.json();
    const candidates = (json.hits || []).map((hit: any) => {
      const d = hit.document || {};
      return { id: String(d[this.cfg.idField || "id"] ?? d.id), title: d[this.cfg.titleField || "title"], score: hit.text_match, highlights: (hit.highlights || []).map((h: any) => h.snippet || h.value).filter(Boolean), createdAt: d.createdAt || d.created_at, updatedAt: d.updatedAt || d.updated_at, trace: [`Typesense collection ${this.cfg.collection}`, `query_by=${this.cfg.queryBy}`, `text_match=${hit.text_match ?? "n/a"}`] } satisfies CandidateSession;
    });
    // Typesense already applies its BM25/text_match ranking here. Keep this adapter
    // as first-stage recall; PiRagService applies the joelclaw-specific rerank once.
    return candidates;
  }

  async get(id: string): Promise<SessionDocument> {
    const url = `${this.cfg.host}/collections/${encodeURIComponent(this.cfg.collection)}/documents/${encodeURIComponent(id)}`;
    const res = await this.fetcher(url, { headers: { "X-TYPESENSE-API-KEY": this.cfg.apiKey } });
    if (!res.ok) throw new Error(`Typesense get failed ${res.status}: ${await res.text()}`);
    return normalizeDocument(await res.json(), this.cfg);
  }
}

export function normalizeDocument(raw: any, cfg: Partial<TypesenseConfig> = {}): SessionDocument {
  const idField = cfg.idField || "id";
  const titleField = cfg.titleField || "title";
  const messagesField = cfg.messagesField || "messages";
  const rawMessages = raw[messagesField] || raw.messages || raw.entries || [];
  let messages: SessionMessage[];
  if (Array.isArray(rawMessages)) {
    messages = rawMessages.map((m: any, i: number) => ({ id: String(m.id ?? i), role: String(m.role ?? m.type ?? "custom"), content: String(m.content ?? m.text ?? m.message ?? ""), createdAt: m.createdAt ?? m.created_at ?? m.timestamp, metadata: m.metadata }));
  } else if (typeof rawMessages === "string") {
    messages = rawMessages.split(/\n{2,}/).filter(Boolean).map((content, i) => ({ id: String(i), role: "custom", content }));
  } else {
    const content = String(raw.content ?? raw.summary ?? "");
    messages = content ? [{ id: "0", role: "custom", content }] : [];
  }
  return { id: String(raw[idField] ?? raw.id), title: raw[titleField] ?? raw.title, source: raw.source, createdAt: raw.createdAt ?? raw.created_at, updatedAt: raw.updatedAt ?? raw.updated_at, messages, metadata: raw };
}

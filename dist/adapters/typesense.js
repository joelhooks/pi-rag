export function configFromEnv(env = process.env) {
    const host = env.TYPESENSE_HOST || env.PI_RAG_TYPESENSE_HOST;
    const apiKey = env.TYPESENSE_API_KEY || env.PI_RAG_TYPESENSE_API_KEY;
    if (!host || !apiKey)
        throw new Error("Typesense config missing. Set TYPESENSE_HOST and TYPESENSE_API_KEY.");
    return { host: host.replace(/\/$/, ""), apiKey, collection: env.PI_RAG_TYPESENSE_COLLECTION || env.TYPESENSE_COLLECTION || "agent_sessions", queryBy: env.PI_RAG_QUERY_BY || "title,content,summary", idField: env.PI_RAG_ID_FIELD || "id", titleField: env.PI_RAG_TITLE_FIELD || "title", messagesField: env.PI_RAG_MESSAGES_FIELD || "messages", preset: env.PI_RAG_TYPESENSE_PRESET, sortBy: env.PI_RAG_SORT_BY, filterBy: env.PI_RAG_FILTER_BY, prefix: env.PI_RAG_PREFIX, exhaustiveSearch: env.PI_RAG_EXHAUSTIVE_SEARCH === "true" };
}
export class TypesenseSessionStore {
    cfg;
    fetcher;
    constructor(cfg = configFromEnv(), fetcher = fetch) {
        this.cfg = cfg;
        this.fetcher = fetcher;
    }
    async search(query, limit = 8, options = {}) {
        const params = new URLSearchParams({ q: query || "*", query_by: this.cfg.queryBy, per_page: String(limit) });
        const filterBy = options.filterBy || this.cfg.filterBy;
        const sortBy = options.sortBy || this.cfg.sortBy;
        const preset = options.preset || this.cfg.preset;
        const prefix = options.prefix || this.cfg.prefix;
        const exhaustive = options.exhaustiveSearch ?? this.cfg.exhaustiveSearch;
        if (filterBy)
            params.set("filter_by", filterBy);
        if (sortBy)
            params.set("sort_by", sortBy);
        if (preset)
            params.set("preset", preset);
        if (prefix)
            params.set("prefix", prefix);
        if (exhaustive != null)
            params.set("exhaustive_search", exhaustive ? "true" : "false");
        const url = `${this.cfg.host}/collections/${encodeURIComponent(this.cfg.collection)}/documents/search?${params}`;
        const res = await this.fetcher(url, { headers: { "X-TYPESENSE-API-KEY": this.cfg.apiKey } });
        if (!res.ok)
            throw new Error(`Typesense search failed ${res.status}: ${await res.text()}`);
        const json = await res.json();
        return (json.hits || []).map((hit) => {
            const d = hit.document || {};
            return { id: String(d[this.cfg.idField || "id"] ?? d.id), title: d[this.cfg.titleField || "title"], score: hit.text_match, highlights: (hit.highlights || []).map((h) => h.snippet || h.value).filter(Boolean), createdAt: d.createdAt || d.created_at, updatedAt: d.updatedAt || d.updated_at, trace: [`Typesense collection ${this.cfg.collection}`, `query_by=${this.cfg.queryBy}`, `text_match=${hit.text_match ?? "n/a"}`] };
        });
    }
    async get(id) {
        const url = `${this.cfg.host}/collections/${encodeURIComponent(this.cfg.collection)}/documents/${encodeURIComponent(id)}`;
        const res = await this.fetcher(url, { headers: { "X-TYPESENSE-API-KEY": this.cfg.apiKey } });
        if (!res.ok)
            throw new Error(`Typesense get failed ${res.status}: ${await res.text()}`);
        return normalizeDocument(await res.json(), this.cfg);
    }
}
export function normalizeDocument(raw, cfg = {}) {
    const idField = cfg.idField || "id";
    const titleField = cfg.titleField || "title";
    const messagesField = cfg.messagesField || "messages";
    const rawMessages = raw[messagesField] || raw.messages || raw.entries || [];
    let messages;
    if (Array.isArray(rawMessages)) {
        messages = rawMessages.map((m, i) => ({ id: String(m.id ?? i), role: String(m.role ?? m.type ?? "custom"), content: String(m.content ?? m.text ?? m.message ?? ""), createdAt: m.createdAt ?? m.created_at ?? m.timestamp, metadata: m.metadata }));
    }
    else if (typeof rawMessages === "string") {
        messages = rawMessages.split(/\n{2,}/).filter(Boolean).map((content, i) => ({ id: String(i), role: "custom", content }));
    }
    else {
        const content = String(raw.content ?? raw.summary ?? "");
        messages = content ? [{ id: "0", role: "custom", content }] : [];
    }
    return { id: String(raw[idField] ?? raw.id), title: raw[titleField] ?? raw.title, source: raw.source, createdAt: raw.createdAt ?? raw.created_at, updatedAt: raw.updatedAt ?? raw.updated_at, messages, metadata: raw };
}

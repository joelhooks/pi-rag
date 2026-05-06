# pi-rag

PageIndex-style retrieval for pi agent sessions and Typesense-backed memory.

This is a pi extension, not an OpenAI Agents SDK app. It borrows the useful PageIndex idea — reason over a hierarchical structure first, then fetch exact bounded content — and adapts it to agent session transcripts.

## Why

Vector search is good for candidate discovery but poor as the only retrieval surface for long sessions. Agent sessions have structure: turns, tool calls, topic shifts, time gaps, and task phases. `pi-rag` uses Typesense for candidate search, then builds a deterministic tree over the session so the agent can inspect structure before pulling content.

Flow:

1. `rag_search_sessions` finds candidate sessions/docs in Typesense.
2. `rag_get_session` returns metadata and counts only.
3. `rag_get_structure` builds a PageIndex-like outline from message ranges.
4. `rag_tree_search` reasons over the tree and selects likely relevant nodes.
5. `rag_get_content` fetches exact bounded transcript slices by node id or range.
6. `rag_summarize_node` summarizes a bounded node with deterministic heuristics or, when explicitly requested, through the pi CLI.

No full-session dumps by default. No OpenAI Agents SDK. No direct paid LLM calls.

## Attribution

Conceptually inspired by [VectifyAI/PageIndex](https://github.com/VectifyAI/PageIndex): hierarchical document structures plus reasoning-based retrieval. This repo does not vendor PageIndex code and does not use the OpenAI Agents SDK.

## Install as a pi extension

Clone and build:

```bash
git clone https://github.com/joelhooks/pi-rag.git
cd pi-rag
bun install
bun run build
```

Symlink or copy the extension into pi's extension directory:

```bash
ln -s "$PWD/src/index.ts" ~/.pi/agent/extensions/pi-rag.ts
# or use dist after build if your pi setup loads compiled JS
ln -s "$PWD/dist/index.js" ~/.pi/agent/extensions/pi-rag.js
```

Restart pi. The tools should appear in the tool list.

## Environment

Required:

```bash
TYPESENSE_HOST=http://localhost:8108
TYPESENSE_API_KEY=...
```

Optional:

```bash
PI_RAG_TYPESENSE_COLLECTION=agent_sessions
PI_RAG_QUERY_BY=title,content,summary
PI_RAG_ID_FIELD=id
PI_RAG_TITLE_FIELD=title
PI_RAG_MESSAGES_FIELD=messages
PI_RAG_CACHE_DIR=.pi-rag/cache
```

The Typesense document should contain either:

- `messages`: array of `{ id, role, content|text|message, createdAt }`; or
- `messages`: string transcript separated by blank lines; or
- `content`/`summary` fallback for single-message docs.

## Tools

### `rag_search_sessions`

Search candidate sessions. Returns ids, titles, highlights, score, and trace metadata.

```json
{ "query": "PageIndex Typesense memory", "limit": 5 }
```

### `rag_get_session`

Metadata only. Use before structure/content retrieval.

```json
{ "sessionId": "abc123" }
```

### `rag_get_structure`

Builds/caches a deterministic hierarchy. Segmentation uses message windows, role mix, time gaps, and explicit topic-shift phrases.

```json
{ "sessionId": "abc123", "refresh": false }
```

### `rag_tree_search`

Inspect the hierarchy and score/select relevant nodes before fetching content.

```json
{ "sessionId": "abc123", "query": "why did the Better Auth ADR happen", "fanout": 3, "maxDepth": 4 }
```

### `rag_get_content`

Exact bounded content by node or range. Large/full dumps are refused unless `allowLarge=true`.

```json
{ "sessionId": "abc123", "nodeId": "n2.1" }
```

or:

```json
{ "sessionId": "abc123", "start": 12, "end": 18 }
```

### `rag_summarize_node`

Summarize one bounded node.

```json
{ "sessionId": "abc123", "nodeId": "n2.1" }
```

Set `usePi=true` only when semantic summarization is worth the latency. It shells through `pi -p --no-session --no-extensions`, not direct provider SDKs.

## Architecture

```text
pi extension
  ├─ registers RAG tools
  ├─ PiRagService
  │   ├─ TypesenseSessionStore — candidate search + doc fetch via HTTP
  │   ├─ FileStructureCache — JSON cache under .pi-rag/cache
  │   ├─ structure builder — deterministic PageIndex-style tree
  │   ├─ tree search — inspect/score/select nodes before fetching content
  │   ├─ corpus tree — group candidate sessions by project/source
  │   └─ summarizers — heuristic first, optional pi CLI semantic summaries
  └─ bounded content retrieval — exact transcript slices with trace
```

## Development

```bash
bun install
bun test
bun run build
```

## Limitations

- The default hierarchy is heuristic. Semantic node summaries are available through pi CLI, but not automatic.
- Typesense schemas vary. Configure field names with env vars.
- This does not replace vector search; it gives agents a better second-stage retrieval surface after candidate discovery.
- Content retrieval is bounded by design. If an agent wants the whole session, it should justify that explicitly with `allowLarge=true`.
- It does not parse PDFs/OCR like upstream PageIndex. This repo targets agent sessions and memory documents.

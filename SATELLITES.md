# Satellite joelclaw machines

`pi-rag` is meant to run on Panda and satellite joelclaw machines.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/joelhooks/pi-rag/main/install.sh | bash
```

Or with an alternate checkout path:

```bash
PI_RAG_HOME=~/Code/joelhooks/pi-rag bash install.sh
```

## Provider config

Every machine needs a provider. Typesense is the joelclaw default.

```bash
export PI_RAG_PROVIDER=typesense
export TYPESENSE_HOST=http://panda:8108        # or Tailscale/Caddy URL
export TYPESENSE_API_KEY=...
export PI_RAG_TYPESENSE_COLLECTION=agent_sessions
export PI_RAG_QUERY_BY=title,content,summary
```

For local-only or test nodes, use a custom provider in code (`InMemorySessionProvider`, `LibSqlSessionProvider`, or a project adapter).

## Participation model

Satellite machines do not need to own memory. They can participate by:

1. Installing the extension globally under `~/.pi/agent/extensions/pi-rag.js`.
2. Pointing to Panda's Typesense or their local provider.
3. Using the same tool discipline:
   `rag_search_sessions → rag_get_session → rag_get_structure → rag_tree_search → rag_get_content → rag_summarize_node`.
4. Writing durable discoveries back through joelclaw memory/OTEL when available.

## Security

- Do not commit provider API keys.
- Prefer read-only Typesense search keys for satellites.
- Use Tailscale/Caddy endpoints instead of public unauthenticated ports.
- Keep content retrieval bounded. Satellite agents should not dump full sessions unless explicitly justified.

## Health check

```bash
node -e "import(process.env.HOME + '/Code/joelhooks/pi-rag/dist/index.js').then(m=>console.log(typeof m.default))"
ls -l ~/.pi/agent/extensions/pi-rag.js
```

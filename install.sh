#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${PI_RAG_REPO_URL:-https://github.com/joelhooks/pi-rag.git}"
TARGET="${PI_RAG_HOME:-$HOME/Code/joelhooks/pi-rag}"
PI_EXT_DIR="${PI_EXTENSION_DIR:-$HOME/.pi/agent/extensions}"
GATEWAY_EXT_DIR="${GATEWAY_PI_EXTENSION_DIR:-$HOME/.joelclaw/gateway/.pi/extensions}"
INSTALL_GATEWAY_LOCAL="${PI_RAG_INSTALL_GATEWAY_LOCAL:-false}"

if [ ! -d "$TARGET/.git" ]; then
  mkdir -p "$(dirname "$TARGET")"
  git clone "$REPO_URL" "$TARGET"
else
  git -C "$TARGET" pull --ff-only
fi

cd "$TARGET"
bun install
bun run build

mkdir -p "$PI_EXT_DIR"
ln -sfn "$TARGET/dist/index.js" "$PI_EXT_DIR/pi-rag.js"

if [ "$INSTALL_GATEWAY_LOCAL" = "true" ] && [ -d "$(dirname "$GATEWAY_EXT_DIR")" ]; then
  mkdir -p "$GATEWAY_EXT_DIR/pi-rag"
  cat > "$GATEWAY_EXT_DIR/pi-rag/index.js" <<JS
export { default } from "$TARGET/dist/index.js";
JS
fi

cat <<EOF
pi-rag installed
repo: $TARGET
global extension: $PI_EXT_DIR/pi-rag.js
gateway project-local extension: $([ "$INSTALL_GATEWAY_LOCAL" = "true" ] && echo "$GATEWAY_EXT_DIR/pi-rag/index.js" || echo "not installed; global extension is used")

Configure provider env, for example:
PI_RAG_PROVIDER=typesense
TYPESENSE_HOST=http://<typesense-host>:8108
TYPESENSE_API_KEY=<key>
PI_RAG_TYPESENSE_COLLECTION=agent_sessions
EOF

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PORT="${1:-8787}"

echo "[OpenClawMDBuilder] Starting one-click launcher..."

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found (requires Node.js 18+)."
  echo "Install Node.js first, then run this script again."
  exit 1
fi

if [ ! -d "./node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

URL="http://127.0.0.1:${PORT}"
echo "Starting server on ${URL}"

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
  open "$URL" >/dev/null 2>&1 || true
fi

PORT="$PORT" node ./server.js

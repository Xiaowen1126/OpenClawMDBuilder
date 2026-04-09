#!/usr/bin/env bash
set -euo pipefail

# One-click release packaging:
# - creates .tar.gz and .zip in ./dist
# - excludes large/local runtime dirs and temp files
#
# Usage:
#   chmod +x ./package-release.sh
#   ./package-release.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

APP_NAME="OpenClawMDBuilder"
TS="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="$ROOT_DIR/dist"
STAGE_DIR="$OUT_DIR/${APP_NAME}-${TS}"

mkdir -p "$OUT_DIR"
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR"

if ! command -v rsync >/dev/null 2>&1; then
  echo "[package] rsync not found. Please install rsync first." >&2
  exit 1
fi

echo "[package] staging files..."
rsync -a ./ "$STAGE_DIR/" \
  --exclude ".git" \
  --exclude "node_modules" \
  --exclude "dist" \
  --exclude "_tmp_import" \
  --exclude "*.log" \
  --exclude "server.err" \
  --exclude "server.out" \
  --exclude ".DS_Store" \
  --exclude "Thumbs.db"

TAR_FILE="$OUT_DIR/${APP_NAME}-${TS}.tar.gz"
ZIP_FILE="$OUT_DIR/${APP_NAME}-${TS}.zip"

echo "[package] creating tar.gz..."
tar -C "$OUT_DIR" -czf "$TAR_FILE" "$(basename "$STAGE_DIR")"

if command -v zip >/dev/null 2>&1; then
  echo "[package] creating zip..."
  (cd "$OUT_DIR" && zip -rq "$(basename "$ZIP_FILE")" "$(basename "$STAGE_DIR")")
else
  echo "[package] zip command not found, skip zip output."
fi

echo "[package] done."
echo "[package] tar: $TAR_FILE"
if [ -f "$ZIP_FILE" ]; then
  echo "[package] zip: $ZIP_FILE"
fi

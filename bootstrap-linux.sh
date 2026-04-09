#!/usr/bin/env bash
set -euo pipefail

# One-click setup for Linux server:
# - install Node.js 18+ if missing
# - install npm dependencies
# - create/update systemd service
# - enable and start service
#
# Usage:
#   chmod +x ./bootstrap-linux.sh
#   ./bootstrap-linux.sh
#
# Optional env vars:
#   APP_DIR=/opt/OpenClawMDBuilder
#   APP_PORT=8787
#   OPENCLAW_WORKSPACE=/home/<user>/.openclaw/workspace
#   SERVICE_NAME=openclaw-md-builder

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
APP_PORT="${APP_PORT:-8787}"
OPENCLAW_WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
SERVICE_NAME="${SERVICE_NAME:-openclaw-md-builder}"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

log() { echo "[bootstrap] $*"; }
fail() { echo "[bootstrap] ERROR: $*" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

sudo_if_needed() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  else
    sudo "$@"
  fi
}

detect_pm() {
  if command -v apt-get >/dev/null 2>&1; then echo "apt"; return; fi
  if command -v dnf >/dev/null 2>&1; then echo "dnf"; return; fi
  if command -v yum >/dev/null 2>&1; then echo "yum"; return; fi
  if command -v zypper >/dev/null 2>&1; then echo "zypper"; return; fi
  echo "unknown"
}

install_node_if_missing() {
  if command -v node >/dev/null 2>&1; then
    local major
    major="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
    if [ "$major" -ge 18 ]; then
      log "Node.js already installed: $(node -v)"
      return
    fi
    fail "Node.js version is too old: $(node -v). Need Node.js 18+."
  fi

  local pm
  pm="$(detect_pm)"
  log "Node.js not found. Package manager: $pm"

  case "$pm" in
    apt)
      sudo_if_needed apt-get update
      sudo_if_needed apt-get install -y curl ca-certificates gnupg
      curl -fsSL https://deb.nodesource.com/setup_20.x | sudo_if_needed bash -
      sudo_if_needed apt-get install -y nodejs
      ;;
    dnf)
      sudo_if_needed dnf install -y curl
      curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo_if_needed bash -
      sudo_if_needed dnf install -y nodejs
      ;;
    yum)
      sudo_if_needed yum install -y curl
      curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo_if_needed bash -
      sudo_if_needed yum install -y nodejs
      ;;
    zypper)
      sudo_if_needed zypper --non-interactive install nodejs20 npm20 || sudo_if_needed zypper --non-interactive install nodejs npm
      ;;
    *)
      fail "Unsupported package manager. Please install Node.js 18+ manually."
      ;;
  esac

  need_cmd node
  log "Installed Node.js: $(node -v)"
}

install_dependencies() {
  cd "$APP_DIR"
  if [ -f package-lock.json ]; then
    log "Installing dependencies with npm ci..."
    npm ci
  else
    log "Installing dependencies with npm install..."
    npm install
  fi
}

write_systemd_service() {
  local node_path
  node_path="$(command -v node)"
  [ -n "$node_path" ] || fail "node executable not found in PATH"

  log "Writing systemd service: $SERVICE_FILE"
  local tmp_file
  tmp_file="$(mktemp)"
  cat >"$tmp_file" <<EOF
[Unit]
Description=OpenClaw MD Builder
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
Environment=PORT=$APP_PORT
Environment=OPENCLAW_WORKSPACE=$OPENCLAW_WORKSPACE
ExecStart=$node_path $APP_DIR/server.js
Restart=always
RestartSec=3
User=$(id -un)

[Install]
WantedBy=multi-user.target
EOF
  sudo_if_needed mv "$tmp_file" "$SERVICE_FILE"
}

enable_and_start() {
  log "Reloading systemd..."
  sudo_if_needed systemctl daemon-reload
  log "Enabling service: $SERVICE_NAME"
  sudo_if_needed systemctl enable "$SERVICE_NAME"
  log "Starting service: $SERVICE_NAME"
  sudo_if_needed systemctl restart "$SERVICE_NAME"
  sudo_if_needed systemctl --no-pager --full status "$SERVICE_NAME" || true
}

main() {
  need_cmd bash
  install_node_if_missing
  install_dependencies
  write_systemd_service
  enable_and_start
  log "Done."
  log "App URL: http://127.0.0.1:${APP_PORT}"
  log "Service logs: sudo journalctl -u ${SERVICE_NAME} -f"
}

main "$@"

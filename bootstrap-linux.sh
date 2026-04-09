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
RUNTIME_DIR="${APP_DIR}/.runtime"
PID_FILE="${RUNTIME_DIR}/${SERVICE_NAME}.pid"
LOG_FILE="${RUNTIME_DIR}/${SERVICE_NAME}.log"

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

has_systemd() {
  command -v systemctl >/dev/null 2>&1 && [ -d /run/systemd/system ]
}

start_without_systemd() {
  local node_path
  node_path="$(command -v node)"
  [ -n "$node_path" ] || fail "node executable not found in PATH"

  mkdir -p "$RUNTIME_DIR"

  if [ -f "$PID_FILE" ]; then
    local old_pid
    old_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [ -n "${old_pid:-}" ] && kill -0 "$old_pid" >/dev/null 2>&1; then
      log "Stopping existing process: $old_pid"
      kill "$old_pid" || true
      sleep 1
    fi
  fi

  log "systemd not available. Starting with nohup fallback..."
  (
    cd "$APP_DIR"
    nohup env PORT="$APP_PORT" OPENCLAW_WORKSPACE="$OPENCLAW_WORKSPACE" "$node_path" "$APP_DIR/server.js" >>"$LOG_FILE" 2>&1 &
    echo $! >"$PID_FILE"
  )

  sleep 1
  local new_pid
  new_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -z "${new_pid:-}" ] || ! kill -0 "$new_pid" >/dev/null 2>&1; then
    fail "Failed to start process in nohup mode. Check log: $LOG_FILE"
  fi
  log "Started PID: $new_pid"
}

main() {
  need_cmd bash
  install_node_if_missing
  install_dependencies
  if has_systemd; then
    write_systemd_service
    enable_and_start
  else
    start_without_systemd
  fi
  log "Done."
  log "App URL: http://127.0.0.1:${APP_PORT}"
  if has_systemd; then
    log "Service logs: sudo journalctl -u ${SERVICE_NAME} -f"
  else
    log "Process log: tail -f ${LOG_FILE}"
    log "Stop command: kill \$(cat ${PID_FILE})"
  fi
}

main "$@"

#!/usr/bin/env bash
set -euo pipefail

# Online one-click installer (Linux + macOS)
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Xiaowen1126/OpenClawMDBuilder/main/install-online.sh | bash
#
# Optional env vars:
#   REPO_URL=https://github.com/Xiaowen1126/OpenClawMDBuilder.git
#   BRANCH=main
#   INSTALL_DIR=/opt/OpenClawMDBuilder   (Linux default when writable/root)
#   APP_PORT=8787
#   OPENCLAW_WORKSPACE=$HOME/.openclaw/workspace
#   SERVICE_NAME=openclaw-md-builder

REPO_URL="${REPO_URL:-https://github.com/Xiaowen1126/OpenClawMDBuilder.git}"
BRANCH="${BRANCH:-main}"
APP_PORT="${APP_PORT:-8787}"
SERVICE_NAME="${SERVICE_NAME:-openclaw-md-builder}"
OS_NAME="$(uname -s)"

if [ -z "${INSTALL_DIR:-}" ]; then
  if [ "$OS_NAME" = "Darwin" ]; then
    INSTALL_DIR="$HOME/OpenClawMDBuilder"
  elif [ -w "/opt" ] || [ "$(id -u)" -eq 0 ]; then
    INSTALL_DIR="/opt/OpenClawMDBuilder"
  else
    INSTALL_DIR="$HOME/OpenClawMDBuilder"
  fi
fi

if [ -z "${OPENCLAW_WORKSPACE:-}" ]; then
  OPENCLAW_WORKSPACE="$HOME/.openclaw/workspace"
fi

RUNTIME_DIR="${INSTALL_DIR}/.runtime"
PID_FILE="${RUNTIME_DIR}/${SERVICE_NAME}.pid"
LOG_FILE="${RUNTIME_DIR}/${SERVICE_NAME}.log"

log() { echo "[install-online] $*"; }
fail() { echo "[install-online] ERROR: $*" >&2; exit 1; }

as_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    fail "Need root privileges for package installation. Re-run as root or install sudo."
  fi
}

detect_linux_pm() {
  if command -v apt-get >/dev/null 2>&1; then echo "apt"; return; fi
  if command -v dnf >/dev/null 2>&1; then echo "dnf"; return; fi
  if command -v yum >/dev/null 2>&1; then echo "yum"; return; fi
  if command -v zypper >/dev/null 2>&1; then echo "zypper"; return; fi
  echo "unknown"
}

install_linux_packages() {
  local pm="$1"; shift
  case "$pm" in
    apt) as_root apt-get update; as_root apt-get install -y "$@" ;;
    dnf) as_root dnf install -y "$@" ;;
    yum) as_root yum install -y "$@" ;;
    zypper) as_root zypper --non-interactive install "$@" ;;
    *) fail "Unsupported package manager. Please install manually: $*" ;;
  esac
}

ensure_base_tools_linux() {
  local pm
  pm="$(detect_linux_pm)"
  [ "$pm" != "unknown" ] || fail "Cannot detect Linux package manager."
  if ! command -v git >/dev/null 2>&1; then install_linux_packages "$pm" git; fi
  if ! command -v curl >/dev/null 2>&1; then install_linux_packages "$pm" curl; fi
}

ensure_base_tools_macos() {
  if ! command -v git >/dev/null 2>&1; then
    fail "git not found. Install Xcode Command Line Tools first: xcode-select --install"
  fi
  if ! command -v curl >/dev/null 2>&1; then
    fail "curl not found."
  fi
}

ensure_node18_plus_linux() {
  if command -v node >/dev/null 2>&1; then
    local major
    major="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
    if [ "$major" -ge 18 ]; then
      log "Node.js found: $(node -v)"
      return
    fi
  fi

  local pm
  pm="$(detect_linux_pm)"
  case "$pm" in
    apt)
      install_linux_packages "$pm" ca-certificates curl gnupg
      curl -fsSL https://deb.nodesource.com/setup_20.x | as_root bash -
      install_linux_packages "$pm" nodejs
      ;;
    dnf)
      install_linux_packages "$pm" curl
      curl -fsSL https://rpm.nodesource.com/setup_20.x | as_root bash -
      install_linux_packages "$pm" nodejs
      ;;
    yum)
      install_linux_packages "$pm" curl
      curl -fsSL https://rpm.nodesource.com/setup_20.x | as_root bash -
      install_linux_packages "$pm" nodejs
      ;;
    zypper)
      install_linux_packages "$pm" nodejs20 npm20 || install_linux_packages "$pm" nodejs npm
      ;;
    *)
      fail "Unsupported package manager for Node.js installation."
      ;;
  esac
}

ensure_node18_plus_macos() {
  if command -v node >/dev/null 2>&1; then
    local major
    major="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
    if [ "$major" -ge 18 ]; then
      log "Node.js found: $(node -v)"
      return
    fi
  fi

  if ! command -v brew >/dev/null 2>&1; then
    fail "Node.js 18+ is required. Install Homebrew first or install Node manually."
  fi
  brew install node
}

ensure_node18_plus() {
  case "$OS_NAME" in
    Linux) ensure_node18_plus_linux ;;
    Darwin) ensure_node18_plus_macos ;;
    *) fail "Unsupported OS: $OS_NAME" ;;
  esac
  command -v node >/dev/null 2>&1 || fail "Node.js installation failed."
  log "Node.js ready: $(node -v)"
}

fetch_repo() {
  if [ -d "$INSTALL_DIR/.git" ]; then
    log "Repo exists, pulling latest..."
    git -C "$INSTALL_DIR" fetch --all --prune
    git -C "$INSTALL_DIR" checkout "$BRANCH"
    git -C "$INSTALL_DIR" pull --ff-only origin "$BRANCH"
  else
    log "Cloning repo to: $INSTALL_DIR"
    mkdir -p "$(dirname "$INSTALL_DIR")"
    git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$INSTALL_DIR"
  fi
}

install_dependencies() {
  cd "$INSTALL_DIR"
  if [ -f package-lock.json ]; then
    npm ci
  else
    npm install
  fi
}

start_macos_like() {
  mkdir -p "$RUNTIME_DIR"
  if [ -f "$PID_FILE" ]; then
    local old_pid
    old_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [ -n "${old_pid:-}" ] && kill -0 "$old_pid" >/dev/null 2>&1; then
      kill "$old_pid" || true
      sleep 1
    fi
  fi
  (
    cd "$INSTALL_DIR"
    nohup env PORT="$APP_PORT" OPENCLAW_WORKSPACE="$OPENCLAW_WORKSPACE" node ./server.js >>"$LOG_FILE" 2>&1 &
    echo $! >"$PID_FILE"
  )
  if command -v open >/dev/null 2>&1; then
    open "http://127.0.0.1:${APP_PORT}" >/dev/null 2>&1 || true
  fi
}

run_bootstrap() {
  case "$OS_NAME" in
    Linux)
      cd "$INSTALL_DIR"
      [ -f "./bootstrap-linux.sh" ] || fail "bootstrap-linux.sh not found."
      chmod +x ./bootstrap-linux.sh
      APP_DIR="$INSTALL_DIR" APP_PORT="$APP_PORT" OPENCLAW_WORKSPACE="$OPENCLAW_WORKSPACE" SERVICE_NAME="$SERVICE_NAME" ./bootstrap-linux.sh
      ;;
    Darwin)
      install_dependencies
      start_macos_like
      log "Started with nohup fallback on macOS."
      log "Log file: $LOG_FILE"
      log "Stop command: kill \$(cat $PID_FILE)"
      ;;
    *)
      fail "Unsupported OS: $OS_NAME"
      ;;
  esac
}

main() {
  log "OS: $OS_NAME"
  case "$OS_NAME" in
    Linux) ensure_base_tools_linux ;;
    Darwin) ensure_base_tools_macos ;;
    *) fail "Unsupported OS: $OS_NAME" ;;
  esac
  ensure_node18_plus
  fetch_repo
  run_bootstrap
  log "Done."
  log "URL: http://127.0.0.1:${APP_PORT}"
}

main "$@"

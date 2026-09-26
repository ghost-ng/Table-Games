#!/usr/bin/env bash
set -euo pipefail

repo_root() {
  cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd -P
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Required command "%s" is missing. Install it in WSL/Linux and try again.\n' "$1" >&2
    return 1
  fi
}

require_node_22() {
  require_command node
  local version
  version="$(node --version)"
  if [[ ! "$version" =~ ^v22\.[0-9]+\.[0-9]+$ ]]; then
    printf 'Node 22.x is required (found %s). Run "nvm install 22 && nvm use 22" in WSL/Linux.\n' "$version" >&2
    return 1
  fi
}

require_npm_10() {
  require_command npm
  local version major
  version="$(npm --version)"
  major="${version%%.*}"
  if [[ ! "$major" =~ ^[0-9]+$ ]] || (( major < 10 )); then
    printf 'npm 10 or newer is required (found %s). Use the npm bundled with Node 22.\n' "$version" >&2
    return 1
  fi
}

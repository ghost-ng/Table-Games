#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/lib.sh"

mode="${1-dev}"
if [[ "$mode" != dev && "$mode" != preview ]]; then
  printf 'Usage: %s [dev|preview] [port] [--base /path/ (preview only)]\n' "$0" >&2
  exit 1
fi
if (( $# )); then shift; fi

preview_args=()
dev_args=()
if (( $# )) && [[ "$1" != --base ]]; then
  port="$1"
  if [[ ! "$port" =~ ^[0-9]{1,5}$ ]] || (( 10#$port < 1 || 10#$port > 65535 )); then
    printf 'Port must be a numeric value between 1 and 65535.\n' >&2
    exit 1
  fi
  port="$((10#$port))"
  preview_args+=("$port")
  dev_args+=(--port "$port")
  shift
fi
if (( $# )); then
  if [[ "$mode" != preview || $# != 2 || "$1" != --base || -z "$2" ]]; then
    printf 'Usage: %s [dev|preview] [port] [--base /path/ (preview only)]\n' "$0" >&2
    exit 1
  fi
  preview_args+=(--base "$2")
fi

cd -- "$(repo_root)"
require_node_22
require_npm_10
if [[ "$mode" == preview ]]; then
  if (( ${#preview_args[@]} )); then
    exec npm run preview -- "${preview_args[@]}"
  fi
  exec npm run preview
fi
if (( ${#dev_args[@]} )); then
  exec npm run start -- "${dev_args[@]}"
fi
exec npm run start

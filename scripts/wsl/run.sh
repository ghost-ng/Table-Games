#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/lib.sh"

mode="${1-dev}"
if (( $# > 2 )) || [[ "$mode" != dev && "$mode" != preview ]]; then
  printf 'Usage: %s [dev|preview] [port]\n' "$0" >&2
  exit 1
fi

if (( $# == 2 )); then
  port="$2"
  if [[ ! "$port" =~ ^[0-9]{1,5}$ ]] || (( 10#$port < 1 || 10#$port > 65535 )); then
    printf 'Port must be a numeric value between 1 and 65535.\n' >&2
    exit 1
  fi
  port="$((10#$port))"
fi

cd -- "$(repo_root)"
require_node_22
require_npm_10
if [[ "$mode" == preview ]]; then
  if (( $# == 2 )); then
    exec npm run preview -- "$port"
  fi
  exec npm run preview
fi
if (( $# == 2 )); then
  exec npm run start -- --port "$port"
fi
exec npm run start

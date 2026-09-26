#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/lib.sh"

cd -- "$(repo_root)"
require_node_22
require_npm_10
# EXPO_BASE_URL is inherited by Expo and the PWA build through npm.
exec npm run build

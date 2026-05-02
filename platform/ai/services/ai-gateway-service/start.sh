#!/usr/bin/env bash
# PM2 launcher for ai-gateway-service (DOS Platform).
set -euo pipefail
cd "$(dirname "$0")"
set -a
# shellcheck source=./.env
source ./.env
set +a
exec node ./dist/server.js

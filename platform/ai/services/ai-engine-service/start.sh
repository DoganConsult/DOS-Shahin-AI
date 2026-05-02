#!/bin/bash
# PM2 launcher for ai-engine-service (DOS Platform).
# Loads ./env, then starts the compiled main.js on PORT (default 4311).
set -euo pipefail
cd "$(dirname "$0")"
set -a
# shellcheck source=./.env
source ./.env
set +a
exec node ./dist/main.js

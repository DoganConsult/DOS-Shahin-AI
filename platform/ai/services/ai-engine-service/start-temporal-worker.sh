#!/bin/bash
# PM2 launcher for the AI-OS Temporal worker.
set -euo pipefail
cd "$(dirname "$0")"
set -a
# shellcheck source=./.env
source ./.env
set +a
exec node ./dist/temporal/worker.js

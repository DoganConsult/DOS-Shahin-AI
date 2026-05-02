#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
set -a
source /root/DOS-AIO/DOS\ Platform/platform/config-center/env/gateway.env
set +a
exec node ./dist/server.js

#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${1:-}"
ROLLBACK_TO="${2:-previous}"

if [ -z "$SERVICE_NAME" ]; then
  echo "Usage: $0 <service-name> [commit-hash|previous]"
  echo "  Examples:"
  echo "    $0 auth-service previous"
  echo "    $0 gateway abc123f"
  exit 1
fi

DEPLOY_PATH="${DEPLOY_PATH:-$(pwd)}"
LOG_DIR="/var/log/dos-platform"

echo "╔══════════════════════════════════════════════════╗"
echo "║  DOS Platform — Service Rollback                 ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Service: $SERVICE_NAME"
echo "  Target:  $ROLLBACK_TO"
echo "  Path:    $DEPLOY_PATH"
echo ""

cd "$DEPLOY_PATH"

CURRENT_COMMIT=$(git rev-parse HEAD)
echo "  Current commit: $CURRENT_COMMIT"

if [ "$ROLLBACK_TO" = "previous" ]; then
  ROLLBACK_TO=$(git log --oneline -2 --format="%H" -- "services/$SERVICE_NAME" | tail -1)
  if [ -z "$ROLLBACK_TO" ]; then
    echo "ERROR: No previous commit found for services/$SERVICE_NAME"
    exit 1
  fi
fi

echo "  Rolling back to: $ROLLBACK_TO"
echo ""

echo "→ Step 1: Stop service"
pm2 stop "$SERVICE_NAME" 2>/dev/null || true

echo "→ Step 2: Checkout service files from target commit"
git checkout "$ROLLBACK_TO" -- "services/$SERVICE_NAME/"

echo "→ Step 3: Rebuild packages (dependencies may have changed)"
pnpm run build:packages 2>/dev/null || true

echo "→ Step 4: Build service"
cd "services/$SERVICE_NAME"
if [ -f "package.json" ] && grep -q '"build"' package.json 2>/dev/null; then
  pnpm run build
fi
cd "$DEPLOY_PATH"

echo "→ Step 5: Restart service"
pm2 restart "$SERVICE_NAME"

echo "→ Step 6: Wait for health check"
sleep 5
PORT=$(node -e "const e = require('./ops/ecosystem.all.config.js'); const a = e.apps.find(a => a.name === '$SERVICE_NAME'); console.log(a?.port || a?.env?.PORT || '?')" 2>/dev/null || echo "?")

if [ "$PORT" != "?" ]; then
  HEALTH=$(curl -sf "http://127.0.0.1:${PORT}/health" 2>/dev/null || echo '{"status":"unreachable"}')
  echo "  Health: $HEALTH"
else
  echo "  Port unknown — check manually"
fi

echo ""
echo "── Rollback Complete ──────────────────────────────"
echo "  Service:  $SERVICE_NAME"
echo "  From:     ${CURRENT_COMMIT:0:12}"
echo "  To:       ${ROLLBACK_TO:0:12}"
echo "  Status:   ✓ Done"
echo ""
echo "  To undo this rollback:"
echo "    git checkout $CURRENT_COMMIT -- services/$SERVICE_NAME/"
echo "    pm2 restart $SERVICE_NAME"

#!/usr/bin/env bash
set -euo pipefail

COMMIT="${1:-}"
if [ -z "$COMMIT" ]; then
  echo "Usage: $0 <commit-hash>"
  echo "  Rolls back ALL services to the given commit"
  exit 1
fi

DEPLOY_PATH="${DEPLOY_PATH:-$(pwd)}"
cd "$DEPLOY_PATH"

echo "╔══════════════════════════════════════════════════╗"
echo "║  DOS Platform — Full Rollback                    ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Target commit: $COMMIT"
echo ""

echo "→ Step 1: Stop all services"
pm2 stop all 2>/dev/null || true

echo "→ Step 2: Checkout target commit"
git checkout "$COMMIT" -- services/ packages/ platform/

echo "→ Step 3: Install dependencies"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

echo "→ Step 4: Rebuild packages"
pnpm run build:packages

echo "→ Step 5: Rebuild services"
pnpm run build:services 2>/dev/null || true

echo "→ Step 6: Restart all services"
pm2 start ops/ecosystem.all.config.js

echo "→ Step 7: Wait for health checks"
sleep 10
bash ops/scripts/health-check-all.sh || true

echo ""
echo "── Rollback Complete ──────────────────────────────"
echo "  To undo: git checkout $(git rev-parse HEAD) -- services/ packages/ platform/"

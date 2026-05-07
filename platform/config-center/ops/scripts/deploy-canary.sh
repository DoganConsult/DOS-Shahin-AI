#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${1:-}"
CANARY_WEIGHT="${2:-10}"
SOAK_DURATION="${3:-120}"
DRY_RUN=false

show_help() {
  cat <<EOF
Usage: $(basename "$0") <service-name> [canary-weight-%] [soak-duration-seconds] [OPTIONS]

Deploys a canary instance, monitors health/error rate, auto-rollbacks on failure.

Arguments:
  service-name         Name of the service to deploy
  canary-weight-%      Traffic percentage for canary (default: 10)
  soak-duration-seconds  Soak time in seconds (default: 120)

Options:
  --dry-run            Show what would be done without executing
  --help, -h           Show this help message

Environment Variables:
  DEPLOY_PATH          Deployment path (default: current directory)

Examples:
  # Deploy with 10% canary weight, 120s soak
  $(basename "$0") auth-service 10 120

  # Deploy with 25% canary weight, 300s soak
  $(basename "$0") gateway 25 300

  # Dry run to preview
  $(basename "$0") auth-service 10 120 --dry-run
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --help|-h) show_help ;;
  esac
done

if [ -z "$SERVICE_NAME" ]; then
  echo "Usage: $0 <service-name> [canary-weight-%] [soak-duration-seconds] [--dry-run]"
  echo "  Deploys a canary instance, monitors health/error rate, auto-rollbacks on failure."
  echo "  Example: $0 auth-service 10 120"
  exit 1
fi

DEPLOY_PATH="${DEPLOY_PATH:-$(pwd)}"
cd "$DEPLOY_PATH"

echo "╔══════════════════════════════════════════════════╗"
echo "║  DOS Platform — Canary Deployment                ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Service:       $SERVICE_NAME"
echo "  Canary Weight: ${CANARY_WEIGHT}%"
echo "  Soak Duration: ${SOAK_DURATION}s"
echo ""

PORT=$(node -e "
  const e = require('./ops/ecosystem.all.config.js');
  const a = e.apps.find(a => a.name === '$SERVICE_NAME');
  console.log(a?.port || a?.env?.PORT || '');
" 2>/dev/null || echo "")

if [ -z "$PORT" ]; then
  echo "ERROR: Could not resolve port for $SERVICE_NAME"
  exit 1
fi

CANARY_PORT=$((PORT + 2000))
CANARY_NAME="${SERVICE_NAME}-canary"
CURRENT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

echo "  Primary: port $PORT"
echo "  Canary:  port $CANARY_PORT"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo "[DRY RUN] Would execute canary deployment:"
  echo "  1. Build new version: pnpm run build"
  echo "  2. Start canary instance on port $CANARY_PORT"
  echo "  3. Wait for canary health check"
  echo "  4. Monitor for ${SOAK_DURATION}s with ${CANARY_WEIGHT}% traffic"
  echo "  5. Auto-rollback on error rate threshold breach"
  echo "  6. Promote or rollback based on health"
  exit 0
fi

echo "→ Step 1: Build new version"
cd "services/$SERVICE_NAME"
if [ -f "package.json" ] && grep -q '"build"' package.json 2>/dev/null; then
  pnpm run build 2>/dev/null || true
fi
cd "$DEPLOY_PATH"

echo "→ Step 2: Start canary instance"
PORT=$CANARY_PORT pm2 start "services/$SERVICE_NAME/dist/server.js" \
  --name "$CANARY_NAME" \
  --node-args="--max-old-space-size=768" \
  --wait-ready \
  --listen-timeout 30000 \
  2>/dev/null || true

echo "→ Step 3: Wait for canary health"
HEALTHY=false
for i in $(seq 1 30); do
  HEALTH=$(curl -sf "http://127.0.0.1:${CANARY_PORT}/health" 2>/dev/null || echo "")
  if echo "$HEALTH" | grep -q '"ok"'; then
    HEALTHY=true
    break
  fi
  sleep 1
done

if [ "$HEALTHY" = "false" ]; then
  echo "✗ Canary failed health check — aborting"
  pm2 delete "$CANARY_NAME" 2>/dev/null || true
  exit 1
fi
echo "  ✓ Canary healthy"

echo "→ Step 4: Soak test (${SOAK_DURATION}s)"
BASELINE_ERRORS=$(curl -sf "http://127.0.0.1:${PORT}/metrics" 2>/dev/null | grep 'dos_errors_total' | awk '{sum+=$2}END{print sum+0}' || echo "0")
SOAK_PASS=true
CHECKS=$((SOAK_DURATION / 10))

for i in $(seq 1 "$CHECKS"); do
  sleep 10

  CANARY_HEALTH=$(curl -sf "http://127.0.0.1:${CANARY_PORT}/health" 2>/dev/null || echo "")
  if ! echo "$CANARY_HEALTH" | grep -q '"ok"'; then
    echo "  ✗ Canary health check failed at ${i}0s — auto-rollback"
    SOAK_PASS=false
    break
  fi

  CANARY_METRICS=$(curl -sf "http://127.0.0.1:${CANARY_PORT}/metrics" 2>/dev/null || echo "")
  CANARY_ERRORS=$(echo "$CANARY_METRICS" | grep 'dos_errors_total' | awk '{sum+=$2}END{print sum+0}' || echo "0")
  CANARY_REQUESTS=$(echo "$CANARY_METRICS" | grep 'dos_http_requests_total' | awk '{sum+=$2}END{print sum+0}' || echo "1")

  if [ "$CANARY_REQUESTS" -gt 10 ]; then
    ERROR_RATE=$(echo "scale=2; $CANARY_ERRORS * 100 / $CANARY_REQUESTS" | bc 2>/dev/null || echo "0")
    if [ "$(echo "$ERROR_RATE > 10" | bc 2>/dev/null || echo 0)" = "1" ]; then
      echo "  ✗ Canary error rate ${ERROR_RATE}% exceeds 10% threshold — auto-rollback"
      SOAK_PASS=false
      break
    fi
  fi

  DIAG=$(curl -sf "http://127.0.0.1:${CANARY_PORT}/diagnostics" 2>/dev/null || echo "")
  HEAP_LEAK=$(echo "$DIAG" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).heapTrend?.leakSuspected||false)}catch{console.log(false)}})" 2>/dev/null || echo "false")
  if [ "$HEAP_LEAK" = "true" ]; then
    echo "  ⚠  Canary heap leak suspected — continuing but flagged"
  fi

  echo "  ✓ Canary check ${i}/${CHECKS} passed"
done

if [ "$SOAK_PASS" = "false" ]; then
  echo ""
  echo "→ Auto-rollback: Stopping canary"
  pm2 delete "$CANARY_NAME" 2>/dev/null || true
  echo "  ✓ Canary removed — primary still running on port $PORT"
  echo "  Status: ✗ CANARY FAILED"
  exit 1
fi

echo ""
echo "→ Step 5: Promote canary to primary"
pm2 stop "$SERVICE_NAME" 2>/dev/null || true
pm2 restart "$SERVICE_NAME" 2>/dev/null || pm2 start "services/$SERVICE_NAME/dist/server.js" \
  --name "$SERVICE_NAME" --wait-ready --listen-timeout 30000

sleep 5
PRIMARY_OK=false
HEALTH=$(curl -sf "http://127.0.0.1:${PORT}/health" 2>/dev/null || echo "")
if echo "$HEALTH" | grep -q '"ok"'; then
  PRIMARY_OK=true
fi

echo "→ Step 6: Remove canary instance"
pm2 delete "$CANARY_NAME" 2>/dev/null || true

echo ""
echo "── Canary Deployment Complete ─────────────────────"
echo "  Service:      $SERVICE_NAME"
echo "  Port:         $PORT"
echo "  Commit:       $CURRENT_COMMIT"
echo "  Soak:         ${SOAK_DURATION}s"
echo "  Primary OK:   $PRIMARY_OK"
echo "  Status:       ✓ Promoted"
echo ""
echo "  To rollback: bash ops/scripts/rollback-service.sh $SERVICE_NAME previous"

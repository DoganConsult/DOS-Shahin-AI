#!/usr/bin/env bash
set -euo pipefail

AUTO_ROLLBACK=true
SERVICE_NAME=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-auto-rollback) AUTO_ROLLBACK=false; shift ;;
    *) SERVICE_NAME="$1"; shift ;;
  esac
done

if [ -z "$SERVICE_NAME" ]; then
  echo "Usage: $0 [--no-auto-rollback] <service-name>"
  echo "  Performs blue-green deployment for the given service."
  echo "  --no-auto-rollback  Disable automatic rollback on health failure"
  echo "  Example: $0 auth-service"
  exit 1
fi

DEPLOY_PATH="${DEPLOY_PATH:-$(pwd)}"
LOG_DIR="/var/log/dos-platform"
ROLLBACK_LOG="$LOG_DIR/deploy-rollback.log"
cd "$DEPLOY_PATH"

mkdir -p "$LOG_DIR"

log_rollback() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" >> "$ROLLBACK_LOG"
}

echo "╔══════════════════════════════════════════════════╗"
echo "║  DOS Platform — Blue-Green Deployment            ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Service:        $SERVICE_NAME"
echo "  Auto-rollback:  $AUTO_ROLLBACK"
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

BLUE_NAME="${SERVICE_NAME}"
GREEN_NAME="${SERVICE_NAME}-green"
GREEN_PORT=$((PORT + 1000))

echo "  Blue:  $BLUE_NAME (port $PORT)"
echo "  Green: $GREEN_NAME (port $GREEN_PORT)"
echo ""

# Save current state for potential rollback
PREVIOUS_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
CURRENT_COMMIT="$PREVIOUS_COMMIT"
echo "  Current commit: ${PREVIOUS_COMMIT:0:12}"

echo "→ Step 1: Build new version"
cd "services/$SERVICE_NAME"
if [ -f "package.json" ] && grep -q '"build"' package.json 2>/dev/null; then
  pnpm run build
fi
cd "$DEPLOY_PATH"

CURRENT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

echo "→ Step 2: Start green instance on port $GREEN_PORT"
pm2 start "services/$SERVICE_NAME/dist/server.js" \
  --name "$GREEN_NAME" \
  --node-args="--max-old-space-size=768" \
  --env "PORT=$GREEN_PORT" \
  --env "SERVICE_CODE=$SERVICE_NAME" \
  --wait-ready \
  --listen-timeout 30000 \
  2>/dev/null || true

echo "→ Step 3: Wait for green health check"
HEALTHY=false
for i in $(seq 1 30); do
  HEALTH=$(curl -sf "http://127.0.0.1:${GREEN_PORT}/health" 2>/dev/null || echo "")
  if echo "$HEALTH" | grep -q '"ok"'; then
    HEALTHY=true
    break
  fi
  sleep 1
done

if [ "$HEALTHY" = "false" ]; then
  echo "✗ Green instance failed health check — aborting deployment"
  pm2 delete "$GREEN_NAME" 2>/dev/null || true
  log_rollback "ABORT service=$SERVICE_NAME reason=green_health_failed commit=$CURRENT_COMMIT"
  exit 1
fi

echo "  ✓ Green instance healthy"
echo ""

echo "→ Step 4: Stop blue instance"
pm2 stop "$BLUE_NAME" 2>/dev/null || true

echo "→ Step 5: Restart blue with new code on original port"
pm2 restart "$BLUE_NAME" 2>/dev/null || pm2 start "services/$SERVICE_NAME/dist/server.js" \
  --name "$BLUE_NAME" \
  --wait-ready \
  --listen-timeout 30000

echo "→ Step 6: Wait for blue health check"
BLUE_HEALTHY=false
for i in $(seq 1 30); do
  HEALTH=$(curl -sf "http://127.0.0.1:${PORT}/health" 2>/dev/null || echo "")
  if echo "$HEALTH" | grep -q '"ok"'; then
    BLUE_HEALTHY=true
    break
  fi
  sleep 1
done

if [ "$BLUE_HEALTHY" = "false" ]; then
  echo "✗ Blue instance failed health check after cutover"

  if [ "$AUTO_ROLLBACK" = "true" ] && [ "$PREVIOUS_COMMIT" != "unknown" ]; then
    echo "→ Auto-rollback: reverting $SERVICE_NAME to ${PREVIOUS_COMMIT:0:12}"
    log_rollback "AUTO-ROLLBACK service=$SERVICE_NAME from=$CURRENT_COMMIT to=${PREVIOUS_COMMIT:0:12} reason=blue_health_failed"

    pm2 stop "$BLUE_NAME" 2>/dev/null || true
    git checkout "$PREVIOUS_COMMIT" -- "services/$SERVICE_NAME/"

    cd "services/$SERVICE_NAME"
    if [ -f "package.json" ] && grep -q '"build"' package.json 2>/dev/null; then
      pnpm run build
    fi
    cd "$DEPLOY_PATH"

    pm2 restart "$BLUE_NAME" 2>/dev/null || true

    # Verify rollback health
    ROLLBACK_HEALTHY=false
    for i in $(seq 1 15); do
      HEALTH=$(curl -sf "http://127.0.0.1:${PORT}/health" 2>/dev/null || echo "")
      if echo "$HEALTH" | grep -q '"ok"'; then
        ROLLBACK_HEALTHY=true
        break
      fi
      sleep 1
    done

    pm2 delete "$GREEN_NAME" 2>/dev/null || true

    if [ "$ROLLBACK_HEALTHY" = "true" ]; then
      echo "  ✓ Auto-rollback successful — service restored to ${PREVIOUS_COMMIT:0:12}"
      log_rollback "AUTO-ROLLBACK-OK service=$SERVICE_NAME restored_to=${PREVIOUS_COMMIT:0:12}"
    else
      echo "  ✗ Auto-rollback failed — manual intervention required"
      echo "    Green may still be running on port $GREEN_PORT as fallback"
      log_rollback "AUTO-ROLLBACK-FAILED service=$SERVICE_NAME manual_intervention_required"
    fi
    exit 1
  else
    echo "  ⚠  Auto-rollback disabled or no previous commit — manual intervention required"
    echo "     Green still running on port $GREEN_PORT as fallback"
    log_rollback "FAILED service=$SERVICE_NAME auto_rollback=disabled"
    exit 1
  fi
fi

echo "→ Step 7: Stop green instance"
pm2 delete "$GREEN_NAME" 2>/dev/null || true

echo "→ Step 8: Post-deploy verification (10s stabilization check)"
sleep 10
STABLE_HEALTH=$(curl -sf "http://127.0.0.1:${PORT}/health" 2>/dev/null || echo "")
if ! echo "$STABLE_HEALTH" | grep -q '"ok"'; then
  echo "  ⚠  Service became unhealthy within 10s of deploy"

  if [ "$AUTO_ROLLBACK" = "true" ] && [ "$PREVIOUS_COMMIT" != "unknown" ]; then
    echo "→ Auto-rollback: reverting $SERVICE_NAME to ${PREVIOUS_COMMIT:0:12}"
    log_rollback "POST-DEPLOY-ROLLBACK service=$SERVICE_NAME from=$CURRENT_COMMIT to=${PREVIOUS_COMMIT:0:12} reason=stabilization_failed"
    bash ops/scripts/rollback-service.sh "$SERVICE_NAME" "$PREVIOUS_COMMIT"
    exit 1
  else
    echo "  Manual intervention required."
    exit 1
  fi
fi

echo ""
echo "── Blue-Green Deployment Complete ─────────────────"
echo "  Service:  $SERVICE_NAME"
echo "  Port:     $PORT"
echo "  Commit:   $CURRENT_COMMIT"
echo "  Status:   ✓ Done"
echo ""
echo "  To rollback: bash ops/scripts/rollback-service.sh $SERVICE_NAME previous"

#!/usr/bin/env bash
set -euo pipefail

show_help() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Deploys product microservices listed in ops/waves/wave2-product.apps.json.

Options:
  --help, -h           Show this help message

Environment Variables:
  WAVE1_ECOSYSTEM_CONFIG  Wave 1 ecosystem config (default: ops/ecosystem.m1.config.js)
  WAVE1_HEALTH_APPS      Comma-separated Wave 1 apps for health check

Prerequisites:
  - Wave 1 platform services must be running
  - wave2-product.apps.json must exist

Examples:
  # Deploy Wave 2 product services
  $(basename "$0)

  # With custom Wave 1 ecosystem
  WAVE1_ECOSYSTEM_CONFIG=/path/to/ecosystem.m1.config.js $(basename "$0)
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in --help|-h) show_help ;; esac
done

# ── Wave 2: Product Services Deployment ──────────────────────────
# Deploys product microservices listed in ops/waves/wave2-product.apps.json (ports from ecosystem)
# Prerequisites: Wave 1 platform services must be running (see WAVE1_HEALTH_APPS + ecosystem.m1).

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SERVICES_DIR="$ROOT_DIR/services"
LOG_DIR="/var/log/dos-platform"

mkdir -p "$LOG_DIR"

WAVE2_JSON="$ROOT_DIR/ops/waves/wave2-product.apps.json"
if [ ! -f "$WAVE2_JSON" ]; then
  echo "FAIL: missing wave2 manifest $WAVE2_JSON"
  exit 1
fi
node "$ROOT_DIR/ops/scripts/validate-wave2-apps.mjs" || exit 1

echo "╔═══════════════════════════════════════════════╗"
echo "║  DOS-AIO Wave 2: Product Services Deployment  ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

# ── Step 1: Verify Wave 1 is running ────────────────────────────
echo "▶ Verifying Wave 1 platform services (from ecosystem.m1 + PM2_APP_FILTER)..."
ECOSYSTEM_CONFIG="${WAVE1_ECOSYSTEM_CONFIG:-$ROOT_DIR/ops/ecosystem.m1.config.js}"
export ECOSYSTEM_CONFIG
PM2_APP_FILTER="${WAVE1_HEALTH_APPS:-gateway,auth-service,tenant-service,user-service,workflow-service,notification-service,audit-service}"
export PM2_APP_FILTER
REPO_ROOT="$ROOT_DIR" SCRIPT_DIR="$SCRIPT_DIR" source "$SCRIPT_DIR/load-pm2-service-list.sh"
dos_load_pm2_service_array || { echo "FAIL: could not load Wave 1 health targets"; exit 1; }
for line in "${SERVICES[@]}"; do
  name="${line%%:*}"
  port="${line##*:}"
  if curl -sf "http://127.0.0.1:$port/health" > /dev/null 2>&1; then
    echo "  ✓ $name ($port) healthy"
  else
    echo "  ✗ $name ($port) NOT responding — run deploy-wave-1-platform.sh first"
    exit 1
  fi
done
unset PM2_APP_FILTER
echo ""

# ── Step 2: Install dependencies ────────────────────────────────
echo "▶ Installing dependencies..."
cd "$ROOT_DIR"
# Workspace uses pnpm; npm --workspaces is incompatible. Tolerate failure and
# rely on prior `pnpm install` having populated node_modules.
(pnpm install --frozen-lockfile 2>&1 || pnpm install 2>&1 || true) | tail -3
echo ""

# ── Step 3: Build packages (if not already built) ───────────────
echo "▶ Building shared packages..."
for pkg in dos-types dos-contracts dos-db dos-module-sdk dos-platform-core dos-event-backbone dos-runtime-config dos-service-bootstrap dos-service-client; do
  PKG_DIR="$ROOT_DIR/packages/$pkg"
  if [ -d "$PKG_DIR" ] && [ -f "$PKG_DIR/tsconfig.json" ]; then
    (cd "$PKG_DIR" && npx tsc -p tsconfig.json --noEmit 2>/dev/null) || true
  fi
done
echo ""

# ── Step 4: Build product services ──────────────────────────────
echo "▶ Building product services (from ops/waves/wave2-product.apps.json)..."
readarray -t PRODUCT_SERVICES < <(node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).forEach(n=>console.log(n))" "$WAVE2_JSON")
PM2_ONLY="$(node -e "const a=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); process.stdout.write(a.join(','))" "$WAVE2_JSON")"

for svc in "${PRODUCT_SERVICES[@]}"; do
  SVC_DIR="$SERVICES_DIR/$svc"
  if [ -f "$SVC_DIR/package.json" ] && [ -f "$SVC_DIR/src/server.ts" ]; then
    echo "  Building $svc..."
    (cd "$SVC_DIR" && npx tsc -p tsconfig.json 2>/dev/null) || echo "  ⚠ $svc build warnings (non-blocking)"
  else
    echo "  ⊘ $svc — missing package.json or server.ts, skipping"
  fi
done
echo ""

# ── Step 5: Start services via PM2 ──────────────────────────────
echo "▶ Starting product services via PM2..."
cd "$ROOT_DIR"
npx pm2 start ops/ecosystem.all.config.js --only "$PM2_ONLY" 2>&1 | tail -5
echo ""

# ── Step 6: Health check all product services ────────────────────
echo "▶ Verifying product service health..."
sleep 5

ECOSYSTEM_CONFIG="${PRODUCT_ECOSYSTEM_CONFIG:-$ROOT_DIR/ops/ecosystem.all.config.js}"
export ECOSYSTEM_CONFIG
PM2_APP_FILTER="$PM2_ONLY"
export PM2_APP_FILTER
REPO_ROOT="$ROOT_DIR" SCRIPT_DIR="$SCRIPT_DIR" source "$SCRIPT_DIR/load-pm2-service-list.sh"
dos_load_pm2_service_array || { echo "FAIL: could not load product health targets from ecosystem"; exit 1; }

HEALTHY=0
TOTAL=${#SERVICES[@]}

for line in "${SERVICES[@]}"; do
  name="${line%%:*}"
  port="${line##*:}"
  if curl -sf "http://127.0.0.1:$port/health" > /dev/null 2>&1; then
    echo "  ✓ $name ($port) healthy"
    HEALTHY=$((HEALTHY + 1))
  else
    echo "  ✗ $name ($port) NOT responding"
  fi
done

unset PM2_APP_FILTER
GW_PORT="$(ECO_PATH="$ROOT_DIR/ops/ecosystem.all.config.js" node -p "const e=require(process.env.ECO_PATH);(e.apps||[]).find(a=>a.name==='gateway')?.port||4000")"

echo ""
echo "═══════════════════════════════════════════════"
echo "  Product services: $HEALTHY/$TOTAL healthy"
echo "  Gateway: http://127.0.0.1:${GW_PORT}"
echo "  PM2 status: npx pm2 status"
echo "═══════════════════════════════════════════════"

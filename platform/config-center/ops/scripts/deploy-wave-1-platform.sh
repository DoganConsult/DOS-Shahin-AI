#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OPS_DIR="$REPO_ROOT/ops"
ENV_DIR="$OPS_DIR/env"
LOG_DIR="${DOS_LOG_DIR:-/var/log/dos-platform}"
ECOSYSTEM_CONFIG="${ECOSYSTEM_CONFIG:-$REPO_ROOT/ops/ecosystem.m1.config.js}"
export ECOSYSTEM_CONFIG

echo "=== DOS Platform — Wave 1 Deployment ==="
echo "Started at: $(date -Iseconds)"
echo "Repo:       $REPO_ROOT"
echo "Ecosystem:  $ECOSYSTEM_CONFIG"
echo ""

echo "[1/8] Checking prerequisites..."
command -v node >/dev/null || { echo "FAIL: node not found"; exit 1; }
command -v pnpm >/dev/null || { echo "FAIL: pnpm not found"; exit 1; }
command -v pm2 >/dev/null || { echo "FAIL: pm2 not found"; exit 1; }
redis-cli ping >/dev/null 2>&1 || { echo "FAIL: Redis not responding"; exit 1; }
PGUSER="${PGUSER:-shahin}"
PGDATABASE="${PGDATABASE:-shahin_grc}"
PGPASSWORD="${PGPASSWORD:-shahin_grc_2024}"
export PGPASSWORD
psql -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 1" >/dev/null 2>&1 || { echo "FAIL: PostgreSQL not responding"; exit 1; }
echo "  Prerequisites OK"

echo "[2/8] Ensuring log directory..."
mkdir -p "$LOG_DIR"
echo "  $LOG_DIR ready"

echo "[3/8] Installing dependencies..."
cd "$REPO_ROOT"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
echo "  Dependencies installed"

echo "[4/8] Building packages..."
pnpm run build:packages
echo "  Packages built"

echo "[5/8] Building services..."
pnpm run build:services
echo "  Services built"

echo "[6/8] Stopping any existing PM2 processes..."
pm2 delete all 2>/dev/null || true
echo "  PM2 cleared"

echo "[7/8] Starting platform services..."
cd "$REPO_ROOT"

REPO_ROOT="$REPO_ROOT" SCRIPT_DIR="$SCRIPT_DIR" source "$SCRIPT_DIR/load-pm2-service-list.sh"
dos_load_pm2_service_array || { echo "FAIL: could not read service list from ecosystem"; exit 1; }

for line in "${SERVICES[@]}"; do
  svc="${line%%:*}"
  if [ -f "$ENV_DIR/$svc.env" ]; then
    # shellcheck disable=SC2046
    export $(grep -v '^#' "$ENV_DIR/$svc.env" | xargs) || true
  fi
done

pm2 start "$ECOSYSTEM_CONFIG"
echo "  PM2 started"

echo "[8/8] Verifying health..."
sleep 5

ALL_OK=true
for line in "${SERVICES[@]}"; do
  name="${line%%:*}"
  port="${line##*:}"
  if curl -sf "http://localhost:$port/health" >/dev/null 2>&1; then
    echo "  $name ($port): OK"
  else
    echo "  $name ($port): FAIL"
    ALL_OK=false
  fi
done

echo ""
pm2 list

GW_PORT="$(ECO_PATH="$ECOSYSTEM_CONFIG" node -p "const e=require(process.env.ECO_PATH);(e.apps||[]).find(a=>a.name==='gateway')?.port||4000")"

if [ "$ALL_OK" = true ]; then
  echo ""
  echo "=== DEPLOYMENT SUCCESSFUL ==="
  echo "All ecosystem apps with /health responded."
  echo "Gateway: http://localhost:${GW_PORT}"
  echo "Nginx:   http://localhost:80 (dos-platform.conf)"
else
  echo ""
  echo "=== DEPLOYMENT PARTIAL ==="
  echo "Some services failed health check. Check: pm2 logs"
  exit 1
fi

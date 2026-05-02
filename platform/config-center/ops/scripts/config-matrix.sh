#!/usr/bin/env bash
set -euo pipefail

echo "╔══════════════════════════════════════════════════╗"
echo "║  DOS Platform — Configuration Matrix             ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

ROOT="${1:-$(pwd)}"

echo "── Environment Variables per Service ─────────────"
printf "%-35s %5s %s\n" "SERVICE" "VARS" "REQUIRED"
echo "───────────────────────────────────────────────────────────────"

TOTAL_VARS=0
TOTAL_SERVICES=0

for env_file in "$ROOT"/services/*/.env.example; do
  [ -f "$env_file" ] || continue
  SVC=$(basename "$(dirname "$env_file")")
  COUNT=$(grep -cE '^[A-Z_]+=' "$env_file" 2>/dev/null || echo 0)
  REQUIRED=$(grep -cE '^[A-Z_]+=\s*$' "$env_file" 2>/dev/null || echo 0)
  printf "%-35s %5d %5d\n" "$SVC" "$COUNT" "$REQUIRED"
  TOTAL_VARS=$((TOTAL_VARS + COUNT))
  TOTAL_SERVICES=$((TOTAL_SERVICES + 1))
done

echo "───────────────────────────────────────────────────────────────"
echo "  Total services: $TOTAL_SERVICES"
echo "  Total config keys: $TOTAL_VARS"
echo ""

echo "── Shared Config (.env.shared) ───────────────────"
if [ -f "$ROOT/platform/config-center/env/.env.shared" ]; then
  SHARED=$(grep -cE '^[A-Z_]+=' "$ROOT/platform/config-center/env/.env.shared" 2>/dev/null || echo 0)
  echo "  Keys: $SHARED"
  echo ""
  grep -E '^[A-Z_]+=' "$ROOT/platform/config-center/env/.env.shared" | head -20 | while IFS='=' read -r key value; do
    echo "  $key"
  done
  [ "$SHARED" -gt 20 ] && echo "  ... and $((SHARED - 20)) more"
else
  echo "  (not found)"
fi
echo ""

echo "── Feature Flags ─────────────────────────────────"
if [ -f "$ROOT/ops/scripts/seed-platform-complete.ts" ]; then
  FLAGS=$(grep -c "code:" "$ROOT/ops/scripts/seed-platform-complete.ts" 2>/dev/null | head -1 || echo "?")
  echo "  Total flags defined in seed: ~$FLAGS"
fi

echo ""
echo "── PM2 Ecosystem Config ──────────────────────────"
if [ -f "$ROOT/ops/ecosystem.all.config.js" ]; then
  APPS=$(grep -c "name:" "$ROOT/ops/ecosystem.all.config.js" 2>/dev/null || echo "?")
  echo "  Managed services: $APPS"
fi

echo ""
echo "── Summary ─────────────────────────────────────────"
echo "  Services with .env.example: $TOTAL_SERVICES"
echo "  Total environment variables: $TOTAL_VARS"
echo "  Prometheus scrape targets:   $(grep -c 'job_name:' "$ROOT/ops/monitoring/prometheus.yml" 2>/dev/null || echo '?')"
echo "  Alert rules:                 $(grep -c 'alert:' "$ROOT/ops/monitoring/alerts.yml" 2>/dev/null || echo '?')"
echo "  Grafana dashboards:          $(ls "$ROOT/ops/monitoring/dashboards/"*.json 2>/dev/null | wc -l)"

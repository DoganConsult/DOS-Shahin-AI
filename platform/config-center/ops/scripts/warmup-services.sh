#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# DOS Platform — Service Warm-up Script
# Sends a warm-up request to each service to pre-initialize DB connection pools
# so that subsequent health checks respond within the 5s timeout threshold.
#
# Service list: same as PM2 — ops/ecosystem.*.config.js via list-pm2-health-targets.mjs
# Usage: bash ops/scripts/warmup-services.sh
# Optional: ECOSYSTEM_CONFIG=/path/to/ecosystem.staging.config.js
# Run after: pm2 restart all
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=load-pm2-service-list.sh
source "$SCRIPT_DIR/load-pm2-service-list.sh"
if ! dos_load_pm2_service_array; then
  echo "ERROR: could not load service list from ecosystem"
  exit 2
fi

WARMUP_TIMEOUT=30  # 30s for first request (DB pool init)

echo "╔══════════════════════════════════════════════════╗"
echo "║  DOS Platform — Service Warm-up                   ║"
echo "║  Timeout: ${WARMUP_TIMEOUT}s per service (cold start)        ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

PASS=0
FAIL=0

for entry in "${SERVICES[@]}"; do
  NAME="${entry%%:*}"
  PORT="${entry##*:}"
  printf "  %-42s" "${NAME}:${PORT}"
  
  HTTP_CODE=$(curl -o /dev/null -s -w "%{http_code}" \
    --max-time ${WARMUP_TIMEOUT} \
    "http://127.0.0.1:${PORT}/health" 2>/dev/null)
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ ${HTTP_CODE}"
    ((PASS++))
  else
    echo "⚠️  ${HTTP_CODE:-TIMEOUT}"
    ((FAIL++))
  fi
done

echo ""
echo "══════════════════════════════════════════════════"
echo "  WARM-UP COMPLETE: ${PASS} ready, ${FAIL} not ready"
echo "══════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "⚠️  Some services did not respond. Check: pm2 logs <service-name>"
  exit 1
fi
exit 0

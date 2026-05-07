#!/usr/bin/env bash
set -uo pipefail

show_help() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Performs health checks on all services defined in the ecosystem configuration.

Options:
  --help, -h           Show this help message

Environment Variables:
  ECOSYSTEM_CONFIG     Path to PM2 ecosystem config
  FRONTEND_HEALTH_URL Frontend URL for smoke test (default: https://shahin-ai.com)
  FRONTEND_HEALTH_ORIGIN Local origin fallback (default: http://127.0.0.1)
  FRONTEND_HEALTH_HOST Host header for local origin (default: shahin-ai.com)
  SKIP_FRONTEND_HEALTH Set to 1 to skip frontend smoke test

Examples:
  # Check all services
  $(basename "$0")

  # Skip frontend check
  SKIP_FRONTEND_HEALTH=1 $(basename "$0)
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in --help|-h) show_help ;; esac
done

echo "╔══════════════════════════════════════════════════╗"
echo "║  DOS Platform — Health Check All Services        ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=load-pm2-service-list.sh
source "$SCRIPT_DIR/load-pm2-service-list.sh"
if ! dos_load_pm2_service_array; then
  echo "ERROR: failed to list health targets from ecosystem (ECOSYSTEM_CONFIG=${ECOSYSTEM_CONFIG:-})"
  exit 2
fi

PASS=0
FAIL=0

for entry in "${SERVICES[@]}"; do
  IFS=':' read -r svc port <<< "$entry"
  HEALTH=$(curl -sf --max-time 5 "http://127.0.0.1:${port}/health" 2>/dev/null || echo '{"status":"unreachable"}')
  STATUS=$(echo "$HEALTH" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)

  if [ "$STATUS" = "ok" ] || [ "$STATUS" = "ready" ]; then
    echo "  ✓ $svc (:$port) — $STATUS"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $svc (:$port) — $STATUS"
    FAIL=$((FAIL + 1))
  fi
done

FRONTEND_URL="${FRONTEND_HEALTH_URL:-https://shahin-ai.com}"
FRONTEND_ORIGIN="${FRONTEND_HEALTH_ORIGIN:-http://127.0.0.1}"
FRONTEND_HOST="${FRONTEND_HEALTH_HOST:-shahin-ai.com}"
if [ "${SKIP_FRONTEND_HEALTH:-0}" != "1" ]; then
  echo ""
  echo "── Frontend smoke (${FRONTEND_URL}) ──"
  # Try public URL first; if unreachable from this host (Cloudflare IPv6 / DNS
  # firewall on build box), fall back to the local nginx origin with a Host
  # header override so we still validate the served bundle end-to-end.
  fe_curl() {
    local path="$1"
    local body
    body=$(curl -fsS --max-time 8 "${FRONTEND_URL}${path}" 2>/dev/null || true)
    if [ -z "$body" ]; then
      body=$(curl -fsS --max-time 5 -H "Host: ${FRONTEND_HOST}" "${FRONTEND_ORIGIN}${path}" 2>/dev/null || true)
    fi
    printf '%s' "$body"
  }
  MANIFEST_BODY=$(fe_curl /manifest.webmanifest)
  if [ -n "$MANIFEST_BODY" ] && echo "$MANIFEST_BODY" | python3 -c "import json,sys; m=json.load(sys.stdin); assert m.get('short_name')=='Shahin-AI'" 2>/dev/null; then
    echo "  ✓ manifest.webmanifest — valid JSON with expected short_name"
    PASS=$((PASS + 1))
  else
    echo "  ✗ manifest.webmanifest — missing, not JSON, or wrong short_name"
    FAIL=$((FAIL + 1))
  fi
  INDEX_BODY=$(fe_curl /)
  if echo "$INDEX_BODY" | grep -q 'manifest.webmanifest'; then
    echo "  ✓ index.html — references manifest.webmanifest"
    PASS=$((PASS + 1))
  else
    echo "  ✗ index.html — unreachable or still references stale manifest filename"
    FAIL=$((FAIL + 1))
  fi
fi

echo ""
echo "── Summary: $PASS passed, $FAIL failed (${#SERVICES[@]} endpoints from ecosystem + frontend) ──"
[ $FAIL -eq 0 ] && echo "  Status: ✓ ALL HEALTHY" || echo "  Status: ✗ DEGRADED"
exit $FAIL

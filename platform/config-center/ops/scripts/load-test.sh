#!/usr/bin/env bash
set -euo pipefail

show_help() {
  cat <<EOF
Usage: $(basename "$0") [concurrency] [duration] [OPTIONS]

Performs load testing on the gateway endpoint.

Arguments:
  concurrency          Number of concurrent requests (default: 100)
  duration             Test duration in seconds (default: 30)

Options:
  --help, -h           Show this help message

Environment Variables:
  LOAD_TEST_ECOSYSTEM  Path to ecosystem config (default: ops/ecosystem.all.config.js)
  E2E_ADMIN_EMAIL      Admin email for auth (default: admin@dogan-ai.com)
  E2E_ADMIN_PASS       Admin password for auth

Examples:
  # Default load test (100 concurrent, 30s)
  $(basename "$0)

  # Custom concurrency and duration
  $(basename "$0) 200 60

  # With custom ecosystem
  LOAD_TEST_ECOSYSTEM=/path/to/ecosystem.config.js $(basename "$0) 100 30
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in --help|-h) show_help ;; esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
GW_PORT="$(ECO_PATH="${LOAD_TEST_ECOSYSTEM:-$REPO_ROOT/ops/ecosystem.all.config.js}" node -p "const e=require(process.env.ECO_PATH);(e.apps||[]).find(a=>a.name==='gateway')?.port||4000")"
GATEWAY="http://127.0.0.1:${GW_PORT}"
AUTH="${GATEWAY}/api/auth/login"
CONCURRENCY="${1:-100}"
DURATION="${2:-30}"
ADMIN_EMAIL="${E2E_ADMIN_EMAIL:-admin@dogan-ai.com}"
ADMIN_PASS="${E2E_ADMIN_PASS:-D0gan@Platform2026!}"

echo "╔══════════════════════════════════════════════════╗"
echo "║  DOS Platform — Load Test                        ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Gateway:     $GATEWAY"
echo "  Concurrency: $CONCURRENCY"
echo "  Duration:    ${DURATION}s"
echo ""

if ! command -v autocannon &>/dev/null; then
  echo "Installing autocannon..."
  npm install -g autocannon 2>/dev/null || {
    echo "autocannon not available — falling back to curl-based load test"
    echo ""

    echo "→ Health endpoint load test (${DURATION}s, ${CONCURRENCY} concurrent)"
    START=$(date +%s)
    TOTAL=0
    ERRORS=0
    while [ $(($(date +%s) - START)) -lt "$DURATION" ]; do
      for i in $(seq 1 "$CONCURRENCY"); do
        STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "${GATEWAY}/health" 2>/dev/null || echo "000")
        TOTAL=$((TOTAL + 1))
        [ "$STATUS" != "200" ] && ERRORS=$((ERRORS + 1))
      done
    done
    ELAPSED=$(($(date +%s) - START))
    echo "  Total requests: $TOTAL"
    echo "  Errors:         $ERRORS"
    echo "  Duration:       ${ELAPSED}s"
    echo "  RPS:            $((TOTAL / (ELAPSED > 0 ? ELAPSED : 1)))"
    exit 0
  }
fi

echo "→ Step 1: Authenticate"
TOKEN=$(curl -sf -X POST "$AUTH" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}" \
  2>/dev/null | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).token)}catch{console.log('')}})" || echo "")

if [ -z "$TOKEN" ]; then
  echo "  ⚠  Authentication failed — running unauthenticated tests only"
  HEADERS=""
else
  echo "  ✓ Authenticated"
  HEADERS="-H \"Authorization=Bearer $TOKEN\""
fi

echo ""
echo "── Test 1: Health Endpoints ──────────────────────"
autocannon -c "$CONCURRENCY" -d "$DURATION" -j "${GATEWAY}/health" | \
  node -e "process.stdin.on('data',d=>{try{const r=JSON.parse(d);console.log('  Req/s:',r.requests.average,'| Latency p99:',r.latency.p99+'ms','| Errors:',r.errors)}catch{}})"

echo ""
echo "── Test 2: Gateway Health ────────────────────────"
autocannon -c "$CONCURRENCY" -d "$DURATION" -j "${GATEWAY}/ready" | \
  node -e "process.stdin.on('data',d=>{try{const r=JSON.parse(d);console.log('  Req/s:',r.requests.average,'| Latency p99:',r.latency.p99+'ms','| Errors:',r.errors)}catch{}})"

if [ -n "$TOKEN" ]; then
  echo ""
  echo "── Test 3: Authenticated API ─────────────────────"
  autocannon -c "$CONCURRENCY" -d "$DURATION" -j \
    -H "Authorization=Bearer $TOKEN" \
    -H "Content-Type=application/json" \
    "${GATEWAY}/api/tenants" | \
    node -e "process.stdin.on('data',d=>{try{const r=JSON.parse(d);console.log('  Req/s:',r.requests.average,'| Latency p99:',r.latency.p99+'ms','| Errors:',r.errors)}catch{}})"

  echo ""
  echo "── Test 4: Risk Module API ───────────────────────"
  autocannon -c "$((CONCURRENCY / 2))" -d "$DURATION" -j \
    -H "Authorization=Bearer $TOKEN" \
    -H "Content-Type=application/json" \
    "${GATEWAY}/api/risk/risks" | \
    node -e "process.stdin.on('data',d=>{try{const r=JSON.parse(d);console.log('  Req/s:',r.requests.average,'| Latency p99:',r.latency.p99+'ms','| Errors:',r.errors)}catch{}})"

  echo ""
  echo "── Test 5: Compliance API ────────────────────────"
  autocannon -c "$((CONCURRENCY / 2))" -d "$DURATION" -j \
    -H "Authorization=Bearer $TOKEN" \
    -H "Content-Type=application/json" \
    "${GATEWAY}/api/compliance/frameworks" | \
    node -e "process.stdin.on('data',d=>{try{const r=JSON.parse(d);console.log('  Req/s:',r.requests.average,'| Latency p99:',r.latency.p99+'ms','| Errors:',r.errors)}catch{}})"
fi

echo ""
echo "── Load Test Complete ─────────────────────────────"
echo "  Target: p99 < 500ms at ${CONCURRENCY} concurrent users"

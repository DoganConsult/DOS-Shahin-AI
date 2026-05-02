#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=load-pm2-service-list.sh
source "$SCRIPT_DIR/load-pm2-service-list.sh"
dos_load_pm2_service_array || exit 2

echo "╔══════════════════════════════════════════════════╗"
echo "║  DOS Platform — SLA Compliance Checker           ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

TOTAL=0
HEALTHY=0
DEGRADED=0
DOWN=0
SLA_VIOLATIONS=0

echo "── Service Availability ──────────────────────────"

for entry in "${SERVICES[@]}"; do
  IFS=: read -r SVC PORT <<< "$entry"
  TOTAL=$((TOTAL + 1))

  HEALTH=$(curl -sf -m 5 "http://127.0.0.1:${PORT}/health" 2>/dev/null || echo '{"status":"down"}')
  STATUS=$(echo "$HEALTH" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).status)}catch{console.log('down')}})" 2>/dev/null || echo "down")
  UPTIME=$(echo "$HEALTH" | node -e "process.stdin.on('data',d=>{try{console.log(Math.round(JSON.parse(d).uptime/60))}catch{console.log(0)}})" 2>/dev/null || echo "0")
  MEM=$(echo "$HEALTH" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).memoryMB||0)}catch{console.log(0)}})" 2>/dev/null || echo "0")

  case "$STATUS" in
    ok) HEALTHY=$((HEALTHY + 1)); ICON="✓";;
    degraded) DEGRADED=$((DEGRADED + 1)); ICON="⚠";;
    *) DOWN=$((DOWN + 1)); ICON="✗"; SLA_VIOLATIONS=$((SLA_VIOLATIONS + 1));;
  esac

  printf "  %s %-35s status=%-8s uptime=%sm  mem=%sMB\n" "$ICON" "$SVC" "$STATUS" "$UPTIME" "$MEM"
done

echo ""
AVAILABILITY=$(echo "scale=2; $HEALTHY * 100 / $TOTAL" | bc 2>/dev/null || echo "0")
echo "── SLA Summary ──────────────────────────────────"
echo "  Total Services:    $TOTAL"
echo "  Healthy:           $HEALTHY"
echo "  Degraded:          $DEGRADED"
echo "  Down:              $DOWN"
echo "  Availability:      ${AVAILABILITY}%"
echo "  SLA Target:        99.5%"
echo ""

echo "── Response Time SLA ──────────────────────────────"
SLA_OK=true
for entry in "${SERVICES[@]}"; do
  IFS=: read -r SVC PORT <<< "$entry"
  SLA=$(curl -sf -m 5 "http://127.0.0.1:${PORT}/sla" 2>/dev/null || echo '{}')
  AVG=$(echo "$SLA" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).globalAvgMs||'N/A')}catch{console.log('N/A')}})" 2>/dev/null || echo "N/A")
  SLOW=$(echo "$SLA" | node -e "process.stdin.on('data',d=>{try{const s=JSON.parse(d).slowRoutes||[];console.log(s.length)}catch{console.log(0)}})" 2>/dev/null || echo "0")

  if [ "$AVG" != "N/A" ] && [ "$AVG" != "0" ]; then
    if [ "$SLOW" -gt 0 ]; then
      printf "  ⚠  %-35s avg=%sms  slow_routes=%s\n" "$SVC" "$AVG" "$SLOW"
      SLA_VIOLATIONS=$((SLA_VIOLATIONS + 1))
    else
      printf "  ✓  %-35s avg=%sms\n" "$SVC" "$AVG"
    fi
  fi
done

echo ""
echo "── Heap Trend Analysis ──────────────────────────"
for entry in "${SERVICES[@]}"; do
  IFS=: read -r SVC PORT <<< "$entry"
  DIAG=$(curl -sf -m 5 "http://127.0.0.1:${PORT}/diagnostics" 2>/dev/null || echo '{}')
  LEAK=$(echo "$DIAG" | node -e "process.stdin.on('data',d=>{try{const h=JSON.parse(d).heapTrend;console.log(h?.leakSuspected?'LEAK':'ok')}catch{console.log('N/A')}})" 2>/dev/null || echo "N/A")
  SLOPE=$(echo "$DIAG" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).heapTrend?.slopeBytes||0)}catch{console.log(0)}})" 2>/dev/null || echo "0")

  if [ "$LEAK" = "LEAK" ]; then
    printf "  ⚠  %-35s LEAK SUSPECTED (slope=%s bytes/min)\n" "$SVC" "$SLOPE"
    SLA_VIOLATIONS=$((SLA_VIOLATIONS + 1))
  fi
done

echo ""
echo "── Result ──────────────────────────────────────────"
if [ "$SLA_VIOLATIONS" -gt 0 ]; then
  echo "  Status: ⚠  $SLA_VIOLATIONS SLA violations detected"
  exit 1
else
  echo "  Status: ✓ All SLA targets met"
fi

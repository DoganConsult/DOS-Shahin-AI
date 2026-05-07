#!/usr/bin/env bash
set -euo pipefail

show_help() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Displays capacity planning report showing system resources and PM2 process usage.

Options:
  --help, -h           Show this help message

Output:
  - System resources (CPUs, Memory, Disk)
  - PM2 process summary
  - Per-service resource usage

Examples:
  # Show capacity report
  $(basename "$0)
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in --help|-h) show_help ;; esac
done

echo "╔══════════════════════════════════════════════════╗"
echo "║  DOS Platform — Capacity Planning Report         ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

echo "── System Resources ──────────────────────────────"
echo "  CPUs:       $(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 'N/A')"
echo "  Memory:     $(free -h 2>/dev/null | awk '/^Mem:/{print $2}' || echo 'N/A')"
echo "  Disk:       $(df -h / 2>/dev/null | awk 'NR==2{print $2 " total, " $5 " used"}' || echo 'N/A')"
echo ""

echo "── PM2 Process Summary ──────────────────────────"
if command -v pm2 &>/dev/null; then
  PM2_JSON=$(pm2 jlist 2>/dev/null || echo "[]")
  TOTAL_PROCS=$(echo "$PM2_JSON" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).length)}catch{console.log(0)}})" 2>/dev/null || echo "0")
  TOTAL_MEM=$(echo "$PM2_JSON" | node -e "
    process.stdin.on('data',d=>{
      try {
        const procs = JSON.parse(d);
        const totalMB = procs.reduce((sum,p) => sum + (p.monit?.memory||0), 0) / 1048576;
        console.log(Math.round(totalMB));
      } catch { console.log(0); }
    });
  " 2>/dev/null || echo "0")
  echo "  Processes:  $TOTAL_PROCS"
  echo "  Total RAM:  ${TOTAL_MEM}MB"
  echo ""

  echo "── Per-Service Resource Usage ──────────────────"
  echo "$PM2_JSON" | node -e "
    process.stdin.on('data', d => {
      try {
        const procs = JSON.parse(d);
        procs.sort((a,b) => (b.monit?.memory||0) - (a.monit?.memory||0));
        for (const p of procs) {
          const memMB = Math.round((p.monit?.memory || 0) / 1048576);
          const cpu = (p.monit?.cpu || 0).toFixed(1);
          const restarts = p.pm2_env?.restart_time || 0;
          const upMin = p.pm2_env?.pm_uptime ? Math.round((Date.now() - p.pm2_env.pm_uptime) / 60000) : 0;
          const status = p.pm2_env?.status || 'unknown';
          console.log('  ' + (status === 'online' ? '✓' : '✗') + ' ' + p.name.padEnd(35) + ' mem=' + memMB + 'MB  cpu=' + cpu + '%  restarts=' + restarts + '  uptime=' + upMin + 'm');
        }
      } catch {}
    });
  " 2>/dev/null || echo "  PM2 data unavailable"
else
  echo "  PM2 not installed"
fi

echo ""
echo "── Database Connection Pool ──────────────────────"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=load-pm2-service-list.sh
source "$SCRIPT_DIR/load-pm2-service-list.sh"
if ! dos_load_pm2_service_array; then
  echo "  (Could not load ecosystem service list — set ECOSYSTEM_CONFIG or fix repo layout)"
  SERVICES=()
fi
for entry in "${SERVICES[@]}"; do
  IFS=: read -r SVC PORT <<< "$entry"
  DIAG=$(curl -sf -m 3 "http://127.0.0.1:${PORT}/diagnostics" 2>/dev/null || echo '{}')
  CB=$(echo "$DIAG" | node -e "
    process.stdin.on('data',d=>{
      try{
        const j=JSON.parse(d);
        const cbs = j.circuitBreakers || [];
        const open = cbs.filter(c=>c.state==='OPEN').length;
        console.log('cb_open=' + open + '/' + cbs.length);
      }catch{console.log('N/A')}
    });
  " 2>/dev/null || echo "N/A")
  printf "  %-35s %s\n" "$SVC" "$CB"
done

echo ""
echo "── Capacity Recommendations ──────────────────────"
echo "  • Max concurrent users target: 100+"
echo "  • Required: 4+ CPU cores, 8GB+ RAM for all 32 services"
echo "  • DB pool: max 10 per service × 32 = 320 total connections"
echo "  • Redis: single instance sufficient for rate limiting + caching"
echo "  • Recommended PM2 cluster mode for gateway (currently 2 instances)"
echo "  • Scale horizontally: add more service instances behind load balancer"
echo ""

echo "── Scaling Thresholds ──────────────────────────"
echo "  Scale UP when:"
echo "    • p95 latency > 2s for 5+ minutes"
echo "    • DB pool waiting > 5 connections"
echo "    • Memory usage > 80% of system RAM"
echo "    • CPU usage > 70% sustained"
echo "  Scale DOWN when:"
echo "    • p95 latency < 200ms for 30+ minutes"
echo "    • Memory usage < 40% of system RAM"
echo "    • CPU usage < 20% sustained"

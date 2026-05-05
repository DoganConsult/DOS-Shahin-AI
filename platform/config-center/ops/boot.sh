#!/usr/bin/env bash
# ============================================================================
# DOS Platform — sequenced PM2 boot (Phase 1 / Wave 0..8).
#
# Source of truth: ops/ports.allocation.json + ops/ecosystem.platform.config.js
#
# Wave order:
#   0   external dependency check (postgres / redis / keycloak)
#   0a  one-shot: dos-migrator
#   0b  one-shot: keycloak-bootstrap
#   1   core shell (auth, tenant, user, gateway, product-shell)
#   2   runtime/dynamic (dynamic-ui, widgets, analytics, notifications,
#       inbox, integrations)
#   3   pillars + admin (dos, dsoc, dnoc, admin)
#   4   AI-OS (ai-gateway, ai-engine, ai-governance, [temporal-workers])
#   5   privacy / mcp / agrc-os
#   6   domain GRC fleet
#   7   overlap services (platform-app-shell, platform-core, platform-product,
#       bcp, vendor)
#   8   sidecars (registry-sync, observability)
#
# Health gate after each wave waits for declared HTTP/healthz endpoints.
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ECOSYSTEM="$ROOT/ops/ecosystem.platform.config.js"
ALLOC="$ROOT/ops/ports.allocation.json"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-60}"

log()   { printf '\033[1;36m[boot] %s\033[0m\n' "$*"; }
warn()  { printf '\033[1;33m[boot WARN] %s\033[0m\n' "$*"; }
fatal() { printf '\033[1;31m[boot FATAL] %s\033[0m\n' "$*"; exit 1; }

require_cmd() { command -v "$1" >/dev/null 2>&1 || fatal "missing command: $1"; }
require_cmd pm2
require_cmd node
require_cmd jq

# ---------------------------------------------------------------------------
# Wave 0 — external dependency probe
# ---------------------------------------------------------------------------
check_tcp() {
  local host=$1 port=$2 label=$3 optional=${4:-no}
  if (echo > "/dev/tcp/$host/$port") 2>/dev/null; then
    log "external OK : $label ($host:$port)"
  else
    if [ "$optional" = "yes" ]; then
      warn "optional dep DOWN: $label ($host:$port) — continuing"
    else
      fatal "required dep DOWN: $label ($host:$port)"
    fi
  fi
}

log "Wave 0 — external dependency probe"
check_tcp 127.0.0.1 5432 postgres
check_tcp 127.0.0.1 6379 redis
check_tcp 127.0.0.1 8180 keycloak
TEMPORAL_UP=no
if (echo > /dev/tcp/127.0.0.1/7233) 2>/dev/null; then TEMPORAL_UP=yes; log "external OK : temporal (127.0.0.1:7233)"; else fatal "required dep DOWN: temporal (127.0.0.1:7233)"; fi
check_tcp 127.0.0.1 4090 langfuse
check_tcp 127.0.0.1 8000 glitchtip

# ---------------------------------------------------------------------------
# Wave-by-wave PM2 start
# ---------------------------------------------------------------------------
start_wave() {
  local wave=$1; shift
  local apps
  # Optional apps (allocation optional:true): start only when _requires probe satisfied (e.g. temporal-server).
  apps=$(TEMPORAL_UP="$TEMPORAL_UP" node -e "
    const c=require('$ECOSYSTEM');
    const tup=process.env.TEMPORAL_UP==='yes';
    const out=c.apps.filter(a=>a._wave===$wave).filter(a=>{
      if(!a._optional) return true;
      const reqs=a._requires||[];
      if(reqs.includes('temporal-server')) return tup;
      return false;
    }).map(a=>a.name);
    console.log(out.join(' '));
  ")
  if [ -z "$apps" ]; then
    log "Wave $wave — no apps"
    return 0
  fi
  log "Wave $wave — starting: $apps"
  pm2 start "$ECOSYSTEM" --only "$(echo $apps | tr ' ' ',')"
}

# Gateway must be healthy before product-shell starts proxying /api/*
start_gateway_then_shell() {
  log "Wave 1a — gateway + auth/tenant/user (excluding product-shell)"
  pm2 start "$ECOSYSTEM" --only gateway,auth-service,tenant-service,user-service
  log "  health-wait :4000 (gateway)"
  local deadline=$((SECONDS + HEALTH_TIMEOUT))
  while ! curl -sf -m 2 "http://127.0.0.1:4000/healthz" >/dev/null 2>&1 \
      && ! curl -sf -m 2 "http://127.0.0.1:4000/health"  >/dev/null 2>&1 ; do
    [ $SECONDS -ge $deadline ] && { warn "  gateway :4000 did not respond within ${HEALTH_TIMEOUT}s"; break; }
    sleep 1
  done
  log "Wave 1b — product-shell (after gateway healthz)"
  pm2 start "$ECOSYSTEM" --only product-shell
}

wait_health() {
  local wave=$1
  local ports
  ports=$(node -e "
    const c=require('$ECOSYSTEM');
    const p=c.apps.filter(a=>a._wave===$wave && a.env && a.env.PORT && !a._optional).map(a=>a.env.PORT);
    console.log(p.join(' '));
  ")
  for port in $ports; do
    local deadline=$((SECONDS + HEALTH_TIMEOUT))
    log "  health-wait :$port"
    while ! curl -sf -m 2 "http://127.0.0.1:$port/healthz" >/dev/null 2>&1 \
        && ! curl -sf -m 2 "http://127.0.0.1:$port/health"  >/dev/null 2>&1 \
        && ! curl -sf -m 2 "http://127.0.0.1:$port/__health" >/dev/null 2>&1 ; do
      [ $SECONDS -ge $deadline ] && { warn "  port $port did not respond to /healthz within ${HEALTH_TIMEOUT}s"; break; }
      sleep 1
    done
  done
}

# Helper: run a PM2-declared one-shot, wait for it to exit, and (on clean
# exit_code 0) DELETE it from the PM2 runtime list. Without the delete, PM2
# parks `--no-autorestart` apps in `waiting restart` forever, polluting the
# fleet status board with permanent YELLOW lines for jobs that completed
# successfully. Non-zero exit is left in place for forensic inspection.
run_oneshot() {
  local app="$1"
  pm2 start "$ECOSYSTEM" --only "$app" --no-autorestart || {
    warn "$app not provisioned — skipping"
    return 0
  }
  # Poll for terminal state. PM2's `wait` is unreliable across versions, so we
  # inspect status + exit_code directly with a hard ceiling.
  local tries=0 status="" code=""
  while [ $tries -lt 60 ]; do
    status=$(pm2 jlist 2>/dev/null | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));const p=d.find(x=>x.name==='$app');process.stdout.write(p?(p.pm2_env.status||''):'')") || status=""
    code=$(pm2 jlist 2>/dev/null   | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));const p=d.find(x=>x.name==='$app');process.stdout.write(p&&p.pm2_env.exit_code!=null?String(p.pm2_env.exit_code):'')") || code=""
    case "$status" in
      stopped|errored|"waiting restart") break ;;
    esac
    sleep 2
    tries=$((tries+1))
  done
  if [ "$code" = "0" ]; then
    log "$app completed (exit=0); removing from PM2 runtime list"
    pm2 delete "$app" >/dev/null 2>&1 || true
  else
    warn "$app terminal exit_code='$code' status='$status' — leaving in PM2 for inspection"
  fi
}

# Wave 0a — migrator (blocks until exit 0 or fail).
log "Wave 0a — dos-migrator (one-shot)"
run_oneshot dos-migrator

# Wave 0b — keycloak-bootstrap (one-shot).
log "Wave 0b — keycloak-bootstrap (one-shot)"
run_oneshot keycloak-bootstrap

# Wave 1 split: gateway-first, then product-shell.
start_gateway_then_shell
wait_health 1

# Remaining long-running waves.
for wave in 2 3 4 5 6 7; do
  start_wave "$wave"
  wait_health "$wave"
done

# Wave 8 — sidecars (kept in separate ecosystem files).
log "Wave 8 — sidecars"
[ -f "$ROOT/ops/ecosystem.registry-sync.config.js" ] && pm2 start "$ROOT/ops/ecosystem.registry-sync.config.js" || warn "registry-sync ecosystem missing"
if [ -f "$ROOT/ops/ecosystem.observability.config.js" ] && [ -x "$ROOT/bin/loki" ]; then
  pm2 start "$ROOT/ops/ecosystem.observability.config.js"
else
  warn "observability stack skipped (binaries not provisioned)"
fi

pm2 save
log "boot complete — pm2 list:"
pm2 list

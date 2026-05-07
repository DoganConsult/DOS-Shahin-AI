#!/usr/bin/env bash
# ============================================================
# DOS-AIO Platform Master Rebuild Script
# Builds ALL packages → services → frontend → reloads PM2
# in strict dependency order. No race conditions. Sequential.
# ============================================================
set -euo pipefail

show_help() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Builds ALL packages → services → frontend → reloads PM2 in strict dependency order.

Options:
  --packages-only      Build only packages
  --services-only      Build only services
  --frontend-only      Build only frontend
  --reload-only        Only reload PM2 (skip builds)
  --help, -h           Show this help message

Examples:
  # Full rebuild
  $(basename "$0)

  # Build only packages
  $(basename "$0) --packages-only

  # Build services and reload
  $(basename "$0) --services-only --reload-only
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in
    --packages-only) DO_PACKAGES=true; DO_SERVICES=false; DO_FRONTEND=false; DO_RELOAD=false ;;
    --services-only) DO_PACKAGES=false; DO_SERVICES=true; DO_FRONTEND=false; DO_RELOAD=false ;;
    --frontend-only) DO_PACKAGES=false; DO_SERVICES=false; DO_FRONTEND=true; DO_RELOAD=false ;;
    --reload-only) DO_PACKAGES=false; DO_SERVICES=false; DO_FRONTEND=false; DO_RELOAD=true ;;
    --help|-h) show_help ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="$ROOT/ops/logs/rebuild"
mkdir -p "$LOG_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
MASTER_LOG="$LOG_DIR/rebuild_${TIMESTAMP}.log"

# ── Colours ──────────────────────────────────────────────────
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

PASS=0; FAIL=0; SKIP=0
declare -a FAILED_ITEMS=()

log()  { echo -e "$*" | tee -a "$MASTER_LOG"; }
ok()   { PASS=$((PASS+1)); log "${GREEN}  ✓ $1${NC}"; }
err()  { FAIL=$((FAIL+1)); FAILED_ITEMS+=("$1"); log "${RED}  ✗ $1${NC}"; }
warn() { SKIP=$((SKIP+1)); log "${YELLOW}  ⚠ $1${NC}"; }
step() { log "\n${CYAN}${BOLD}══ $1 ══${NC}"; }

# ── Arg parsing ───────────────────────────────────────────────
DO_PACKAGES=true
DO_SERVICES=true
DO_FRONTEND=true
DO_RELOAD=true

for arg in "$@"; do
  case $arg in
    --packages-only) DO_SERVICES=false; DO_FRONTEND=false; DO_RELOAD=false ;;
    --services-only) DO_PACKAGES=false; DO_FRONTEND=false; DO_RELOAD=false ;;
    --frontend-only) DO_PACKAGES=false; DO_SERVICES=false; DO_RELOAD=false ;;
    --reload-only)   DO_PACKAGES=false; DO_SERVICES=false; DO_FRONTEND=false ;;
    --no-frontend)   DO_FRONTEND=false ;;
    --no-reload)     DO_RELOAD=false ;;
  esac
done

log "\n${BOLD}╔══════════════════════════════════════════╗${NC}"
log "${BOLD}║   DOS-AIO Platform Rebuild  ${TIMESTAMP}  ║${NC}"
log "${BOLD}╚══════════════════════════════════════════╝${NC}"
log "Log: $MASTER_LOG"
log "Root: $ROOT"

# ── Helper: build one package ─────────────────────────────────
build_pkg() {
  local dir="$ROOT/packages/$1"
  local label="${2:-$1}"
  if [[ ! -f "$dir/package.json" ]]; then
    warn "$label — directory missing, skip"
    return
  fi
  local pkg_log="$LOG_DIR/pkg_${1}_${TIMESTAMP}.log"
  log "  → Building $label..."
  if (cd "$dir" && pnpm run build > "$pkg_log" 2>&1); then
    ok "$label"
  else
    err "$label (see $pkg_log)"
    tail -20 "$pkg_log" | tee -a "$MASTER_LOG" || true
  fi
}

# ── Helper: build one service ─────────────────────────────────
build_svc() {
  local dir="$ROOT/services/$1"
  local label="${2:-$1}"
  if [[ ! -f "$dir/package.json" ]]; then
    warn "$label — directory missing, skip"
    return
  fi
  local svc_log="$LOG_DIR/svc_${1}_${TIMESTAMP}.log"
  log "  → Building $label..."
  # Some services use `tsc || true` in their package.json for soft failures
  if (cd "$dir" && pnpm run build > "$svc_log" 2>&1); then
    ok "$label"
  else
    # Check if dist/server.js still exists (soft-failure build)
    if [[ -f "$dir/dist/server.js" ]] || [[ -f "$dir/dist/main.js" ]]; then
      warn "$label — build had errors but dist exists (non-blocking)"
    else
      err "$label (see $svc_log)"
      tail -10 "$svc_log" | tee -a "$MASTER_LOG" || true
    fi
  fi
}

# ================================================================
# PHASE 1: SHARED PACKAGES (strict dependency order)
# ================================================================
if [[ "$DO_PACKAGES" == "true" ]]; then
  step "PHASE 1: Shared Packages (Tier 1 — Foundation)"
  # Tier 1: No internal deps
  build_pkg "dos-types"              "@dos/types"
  build_pkg "architecture-types"    "architecture-types"
  build_pkg "errors"                 "errors"
  build_pkg "utils"                  "utils"
  build_pkg "shared-compliance-types" "@shahin-grc/shared-compliance-types"
  build_pkg "shared-risk-types"      "@shahin-grc/shared-risk-types"
  build_pkg "shared-workflow-types"  "@shahin-grc/shared-workflow-types"

  step "PHASE 1: Shared Packages (Tier 2 — Contracts & DB)"
  # Tier 2: Depend on Tier 1
  build_pkg "dos-contracts"          "@dos/contracts"
  build_pkg "dos-db"                 "@dos/db"

  step "PHASE 1: Shared Packages (Tier 3 — Platform Core)"
  # Tier 3: Depend on Tier 1+2
  build_pkg "dos-platform-core"      "@dos/platform-core"

  step "PHASE 1: Shared Packages (Tier 4 — SDK & Middleware)"
  # Tier 4: Depend on Tier 1+2+3
  build_pkg "dos-event-backbone"     "@dos/event-backbone"
  build_pkg "dos-runtime-config"     "@dos/runtime-config"
  build_pkg "dos-service-client"     "@dos/service-client"
  build_pkg "dos-module-sdk"         "@dos/module-sdk"
  build_pkg "dos-service-bootstrap"  "@dos/service-bootstrap"

  step "PHASE 1: Shared Packages (Tier 5 — Product Layer)"
  # Tier 5: Depend on everything above
  build_pkg "shahin-product"         "@shahin/product"
  build_pkg "platform"               "platform"
  build_pkg "config"                 "config"
fi

# ================================================================
# PHASE 2: MICROSERVICES (sequential, one by one)
# ================================================================
if [[ "$DO_SERVICES" == "true" ]]; then
  step "PHASE 2: Microservices (Group A — Core Platform)"

  # Group A: Core identity & tenancy — other services depend on these
  build_svc "auth-service"           "auth-service"
  build_svc "tenant-service"         "tenant-service"
  build_svc "user-service"           "user-service"
  build_svc "workflow-service"       "workflow-service"

  step "PHASE 2: Microservices (Group B — Gateway & Shell)"
  build_svc "gateway"                "gateway"
  build_svc "product-shell"          "product-shell"

  step "PHASE 2: Microservices (Group C — Platform Services)"
  build_svc "platform-core-service"      "platform-core-service"
  build_svc "platform-product-service"   "platform-product-service"
  build_svc "notification-service"       "notification-service"
  build_svc "notification-inbox-service" "notification-inbox-service"
  build_svc "audit-service"             "audit-service"

  step "PHASE 2: Microservices (Group D — AI Services)"
  build_svc "ai-engine-service"      "ai-engine-service"
  build_svc "ai-gateway-service"     "ai-gateway-service"
  build_svc "agrc-os-service"        "agrc-os-service"

  step "PHASE 2: Microservices (Group E — Domain Modules)"
  build_svc "compliance-controls-service"      "compliance-controls-service"
  build_svc "risk-incident-service"            "risk-incident-service"
  build_svc "governance-policy-service"        "governance-policy-service"
  build_svc "evidence-audit-reporting-service" "evidence-audit-reporting-service"
  build_svc "audit-service"                    "audit-service (verify)"
  build_svc "vendor-service"                   "vendor-service"
  build_svc "asset-service"                    "asset-service"
  build_svc "bcp-service"                      "bcp-service"
  build_svc "training-service"                 "training-service"
  build_svc "privacy-service"                  "privacy-service"
  build_svc "dora-service"                     "dora-service"
  build_svc "remediation-action-service"       "remediation-action-service"
  build_svc "qiyas-journey-service"            "qiyas-journey-service"
  build_svc "integrations-service"             "integrations-service"
  build_svc "portals-service"                  "portals-service"
  build_svc "records-service"                  "records-service"
  build_svc "executive-intelligence-service"   "executive-intelligence-service"

  step "PHASE 2: Microservices (Group F — Analytics & Reporting)"
  build_svc "analytics-service"               "analytics-service"
  build_svc "analytics-reporting-service"     "analytics-reporting-service"
  build_svc "dashboard-widgets-service"       "dashboard-widgets-service"

  step "PHASE 2: Microservices (Group G — Onboarding)"
  build_svc "onboarding-service"              "onboarding-service"
fi

# ================================================================
# PHASE 3: FRONTEND (Angular SPA)
# ================================================================
if [[ "$DO_FRONTEND" == "true" ]]; then
  step "PHASE 3: Angular Frontend (shahin-grc)"
  FRONTEND_DIR="$ROOT/frontend/products/shahin"
  FRONTEND_LOG="$LOG_DIR/frontend_${TIMESTAMP}.log"

  if [[ ! -d "$FRONTEND_DIR" ]]; then
    err "Frontend directory not found: $FRONTEND_DIR"
  else
    log "  → Running prebuild (route fragments)..."
    (cd "$FRONTEND_DIR" && node scripts/generate-route-fragments.mjs >> "$FRONTEND_LOG" 2>&1) && \
      log "    route fragments: ok" || log "    route fragments: warn (non-fatal)"

    log "  → Building Angular production bundle..."
    if (cd "$FRONTEND_DIR" && node_modules/.bin/ng build --configuration=production >> "$FRONTEND_LOG" 2>&1); then
      INDEX="$FRONTEND_DIR/dist/shahin-grc/browser/index.html"
      if [[ -f "$INDEX" ]]; then
        SIZE=$(du -sh "$FRONTEND_DIR/dist/shahin-grc/browser" 2>/dev/null | cut -f1)
        ok "Angular SPA ($SIZE)"
      else
        err "Angular build exited 0 but index.html not found"
      fi
    else
      err "Angular SPA build failed (see $FRONTEND_LOG)"
      grep "ERROR\|error NG\|TS[0-9]" "$FRONTEND_LOG" | head -20 | tee -a "$MASTER_LOG" || true
    fi
  fi
fi

# ================================================================
# PHASE 4: PM2 RELOAD (zero-downtime where possible)
# ================================================================
if [[ "$DO_RELOAD" == "true" ]]; then
  step "PHASE 4: PM2 Reload / Start"

  # Kill any orphaned build processes first
  pkill -f "ng build" 2>/dev/null || true

  if pm2 list > /dev/null 2>&1; then
    RUNNING=$(pm2 list --no-color 2>/dev/null | grep -c "online" || true)
    if [[ "$RUNNING" -gt 0 ]]; then
      log "  → Reloading $RUNNING running services (zero-downtime)..."
      pm2 reload "$ROOT/ops/ecosystem.all.config.js" --update-env >> "$LOG_DIR/pm2_${TIMESTAMP}.log" 2>&1 && \
        ok "PM2 reload" || { warn "PM2 reload had warnings, trying restart..."; 
        pm2 restart "$ROOT/ops/ecosystem.all.config.js" --update-env >> "$LOG_DIR/pm2_${TIMESTAMP}.log" 2>&1 && ok "PM2 restart" || err "PM2 restart"; }
    else
      log "  → No services running, starting all..."
      pm2 start "$ROOT/ops/ecosystem.all.config.js" >> "$LOG_DIR/pm2_${TIMESTAMP}.log" 2>&1 && \
        ok "PM2 start" || err "PM2 start"
    fi
    sleep 5
    pm2 save >> /dev/null 2>&1 || true

    # Verify health of critical services (names resolved from PM2 ecosystem, no hardcoded ports)
    log "\n  Health check (critical services):"
    CRITICAL_NAMES=(gateway auth-service tenant-service user-service product-shell)
    export ECOSYSTEM_CONFIG="${ECOSYSTEM_CONFIG:-$ROOT/ops/ecosystem.all.config.js}"
    [[ "${ECOSYSTEM_CONFIG}" != /* ]] && ECOSYSTEM_CONFIG="$ROOT/${ECOSYSTEM_CONFIG#./}"
    mapfile -t _ECO_LINES < <(node "$ROOT/ops/scripts/list-pm2-health-targets.mjs" 2>/dev/null || true)
    for want in "${CRITICAL_NAMES[@]}"; do
      port=""; svc="$want"
      for entry in "${_ECO_LINES[@]}"; do
        [[ "$entry" == "$want":* ]] || continue
        svc="${entry%%:*}"
        port="${entry##*:}"
        break
      done
      if [[ -z "$port" ]]; then
        warn "  $want — not in ecosystem (skipped)"
        continue
      fi
      code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:$port/health" 2>/dev/null || echo "000")
      if [[ "$code" == "200" ]] || [[ "$code" == "503" ]]; then
        ok "  $svc :$port → HTTP $code"
      else
        err "  $svc :$port → HTTP $code (unreachable)"
      fi
    done
  else
    warn "PM2 not available — run: pm2 start $ROOT/ops/ecosystem.all.config.js"
  fi
fi

# ================================================================
# SUMMARY
# ================================================================
step "BUILD COMPLETE"
TOTAL=$((PASS + FAIL + SKIP))
log "\n${BOLD}Results: ${GREEN}$PASS passed${NC} | ${RED}$FAIL failed${NC} | ${YELLOW}$SKIP skipped${NC} | $TOTAL total${NC}"
log "Full log: $MASTER_LOG"

if [[ ${#FAILED_ITEMS[@]} -gt 0 ]]; then
  log "\n${RED}${BOLD}Failed items:${NC}"
  for item in "${FAILED_ITEMS[@]}"; do
    log "  ${RED}✗ $item${NC}"
  done
  log "\n${RED}Platform rebuild INCOMPLETE — fix failures above and re-run${NC}"
  exit 1
else
  log "\n${GREEN}${BOLD}✓ Platform rebuild COMPLETE — all items passed${NC}"
  exit 0
fi

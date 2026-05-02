#!/usr/bin/env bash
# Phase 2 / Module 1b (Process Tasks SLA) — DoD harness.
# Probes the SLA dashboard endpoints the Shahin sla-dashboard.component
# calls (process-tasks/sla-stats, sla-by-role, sla-breaches, sla-warnings)
# plus the LIST handler. Pre-fix these returned 60s timeouts (tenantGuard
# factory mistake + handler bug) — see commit log for the full chain.
set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TS=$(date +"%Y%m%d_%H%M%S")
. "$SCRIPT_DIR/lib/dod-token.sh"
. "$SCRIPT_DIR/lib/dod-probe.sh"
mint_dod_token || exit $?
probe_dod_endpoints \
  --module process-tasks \
  --phase  "Phase 2 / Module 1b" \
  --out    "$REPO_ROOT/ops/proofs/module-process-tasks-dod-${TS}.json" \
  -- \
  "list:/api/process-tasks" \
  "listLimited:/api/process-tasks?limit=10" \
  "slaStats:/api/process-tasks/sla-stats" \
  "slaByRole:/api/process-tasks/sla-by-role" \
  "slaBreaches:/api/process-tasks/sla-breaches" \
  "slaWarnings:/api/process-tasks/sla-warnings"

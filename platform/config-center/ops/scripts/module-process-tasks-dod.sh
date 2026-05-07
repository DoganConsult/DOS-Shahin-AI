#!/usr/bin/env bash
# Phase 2 / Module 1b (Process Tasks SLA) — DoD harness.
set -u

show_help() {
  cat <<EOF
Usage: $(basename "$0) [OPTIONS]

DoD harness for Phase 2 / Module 1b (Process Tasks SLA).

Options:
  --help, -h           Show this help message

Output:
  Creates timestamped proof file at ops/proofs/module-process-tasks-dod-<timestamp>.json

Probes:
  SLA dashboard endpoints: sla-stats, sla-by-role, sla-breaches, sla-warnings

Examples:
  # Run process-tasks DoD proof
  $(basename "$0)
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in --help|-h) show_help ;; esac
done

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

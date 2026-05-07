#!/usr/bin/env bash
# Module 5 (Teams) — DoD harness.
set -u

show_help() {
  cat <<EOF
Usage: $(basename "$0) [OPTIONS]

DoD harness for Phase 1 / Module 5 (Teams).

Options:
  --help, -h           Show this help message

Output:
  Creates timestamped proof file at ops/proofs/module-teams-dod-<timestamp>.json

Probes:
  Team CRUD endpoints the Teams page depends on

Examples:
  # Run teams DoD proof
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
  --module teams \
  --phase  "Phase 1 / Module 5" \
  --out    "$REPO_ROOT/ops/proofs/module-teams-dod-${TS}.json" \
  -- \
  "teams:/api/teams" \
  "foundationTeams:/api/foundation/teams" \
  "departments:/api/foundation/departments"

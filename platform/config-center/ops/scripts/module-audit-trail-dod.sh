#!/usr/bin/env bash
# Module 8 (Audit Trail) — DoD harness.
set -u

show_help() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

DoD harness for Phase 1 / Module 8 (Audit Trail).

Options:
  --help, -h           Show this help message

Output:
  Creates timestamped proof file at ops/proofs/module-audit-trail-dod-<timestamp>.json

Examples:
  # Run audit-trail DoD proof
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
  --module audit-trail \
  --phase  "Phase 1 / Module 8" \
  --out    "$REPO_ROOT/ops/proofs/module-audit-trail-dod-${TS}.json" \
  -- \
  "audit:/api/audit-trail" \
  "auditPaginated:/api/audit-trail?limit=20" \
  "auditDeep:/api/audit-trail?limit=50&offset=0"

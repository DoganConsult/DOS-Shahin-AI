#!/usr/bin/env bash
# Module 3 (Organization) — DoD harness.
set -u

show_help() {
  cat <<EOF
Usage: $(basename "$0) [OPTIONS]

DoD harness for Phase 1 / Module 3 (Organization).

Options:
  --help, -h           Show this help message

Output:
  Creates timestamped proof file at ops/proofs/module-organization-dod-<timestamp>.json

Probes:
  organizations / business-units / departments / positions / locations /
  committees / ownership-mappings / org-hierarchy

Examples:
  # Run organization DoD proof
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
  --module organization \
  --phase  "Phase 1 / Module 3" \
  --out    "$REPO_ROOT/ops/proofs/module-organization-dod-${TS}.json" \
  -- \
  "organizations:/api/organizations" \
  "businessUnits:/api/business-units" \
  "departments:/api/foundation/departments" \
  "positions:/api/positions" \
  "locations:/api/locations" \
  "committees:/api/committees" \
  "ownership:/api/ownership-mappings"
# Note: orgHierarchyRouter has only GET /:scopeType/:scopeId — bare
# /api/foundation/org-hierarchy is intentionally 404. The FE doesn't
# call it bare; if added later, parameterise the probe.
